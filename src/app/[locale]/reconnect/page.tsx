'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, redirect } from 'next/navigation'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { plex } from '@/app/fonts/plex'
import Header from '@/app/_components/Header'
import LoadingIndicator from '@/app/_components/LoadingIndicator'
import Footer from '@/app/_components/Footer'
import { MatchingTarget, MatchingStats } from '@/lib/types/matching'
import { UserCompleteStats, GlobalStats } from '@/lib/types/stats'
import { time } from 'console'
import Link from 'next/link'
import DashboardLoginButtons from '@/app/_components/DashboardLoginButtons'

// Dynamic imports for heavy components
const DashboardSea = dynamic(() => import('@/app/_components/DashboardSea'), {
  loading: () => <div className="animate-pulse bg-blue-900/50 h-[600px]" />
})

const MigrateStats = dynamic(() => import('@/app/_components/MigrateStats'), {
  loading: () => <div className="animate-pulse bg-blue-900/50 h-24" />
})

const SuccessAutomaticReconnexion = dynamic(() => import('@/app/_components/SuccessAutomaticReconnexion'), {
  loading: () => <div className="flex justify-center"><LoadingIndicator msg="Loading success view" /></div>
})

const AutomaticReconnexion = dynamic(() => import('@/app/_components/AutomaticReconnexion'), {
  loading: () => <div className="flex justify-center"><LoadingIndicator msg="Automatic" /></div>
})

const ReconnexionOptions = dynamic(() => import('@/app/_components/ReconnexionOptions'), {
  loading: () => <div className="flex justify-center"><LoadingIndicator msg="Reconnection options" /></div>
})

const ManualReconnexion = dynamic(() => import('@/app/_components/ManualReconnexion'), {
  loading: () => <div className="flex justify-center"><LoadingIndicator msg="Manual" /></div>
})

// type GlobalStats = {
//   connections: {
//     followers: number;
//     following: number;
//   };
//   matches: {
//     bluesky: {
//       total: number;
//       hasFollowed: number;
//       notFollowed: number;
//     };
//     mastodon: {
//       total: number;
//       hasFollowed: number;
//       notFollowed: number;
//     };
//   };
// };

type ProviderStatus = 'reconnection' | 'first_connect';
type MissingProvidersType = {
  [key in 'bluesky' | 'mastodon']?: ProviderStatus;
};

export default function MigratePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('migrate')
  const tRefresh = useTranslations('refreshToken')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [showOptions, setShowOptions] = useState(true)
  const [isAutomaticReconnect, setIsAutomaticReconnect] = useState(false)
  const [invalidTokenProviders, setInvalidTokenProviders] = useState<string[]>([])
  const [accountsToProcess, setAccountsToProcess] = useState<MatchingTarget[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'mastodon' | 'bluesky'>('bluesky')
  const [stats, setStats] = useState<{ userStats: UserCompleteStats; globalStats: GlobalStats } | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | undefined>(undefined)
  const [showModaleResults, setShowModaleResults] = useState(false)
  const [migrationResults, setMigrationResults] = useState<{ bluesky: { attempted: number; succeeded: number }; mastodon: { attempted: number; succeeded: number } } | null>(null)
  const [missingProviders, setMissingProviders] = useState<MissingProvidersType>({})
  const [isReconnectionComplete, setIsReconnectionComplete] = useState(false)
  const [mastodonInstances, setMastodonInstances] = useState<string[]>([])

  // Ajout d'un useEffect pour vérifier les tokens au chargement
  useEffect(() => {
    const verifyTokens = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        const data = await response.json()

        if (!data.success && data.providers) {
          setMissingProviders({
            bluesky: 'reconnection' as const,
            mastodon: 'reconnection' as const
          })
        }
      } catch (error) {
        console.error('Error verifying tokens:', error)
      } finally {
        setIsLoading(false)
      }
    }

    verifyTokens()
  }, []) // Ce useEffect s'exécute une seule fois au chargement

  useEffect(() => {
    const fetchData = async () => {
      console.log("🔄 [fetchData] Starting data fetch for user:", session?.user?.id)
      
      try {
        setIsLoading(true)
        const [totalMatches, userMatches, matchingResponse, refreshTokenResponse] = await Promise.all([
          fetch('/api/stats/total'),
          fetch('/api/stats'),
          fetch('/api/migrate/matching_found', {
            headers: {
              'Cache-Control': 'no-cache'
            }
          }),
          fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
        ])

        console.log("📊 [fetchData] API responses received:", {
          totalStats: totalMatches.status,
          userStats: userMatches.status,
          matching: matchingResponse.status,
          refresh: refreshTokenResponse.status
        })

        const [globalStats, userStats, matchingData, refreshData] = await Promise.all([
          totalMatches.json(),
          userMatches.json(),
          matchingResponse.json(),
          refreshTokenResponse.json()
        ])

        console.log("🔑 [fetchData] Refresh token response:", refreshData)
        if (!refreshData.success && refreshData.providers) {
          console.log("⚠️ [fetchData] Missing providers:", refreshData.missingProviders)
          const providersObj = refreshData.providers.reduce((acc, provider) => ({
            ...acc,
            [provider]: 'reconnection' as const
          }), {} as MissingProvidersType);
          setMissingProviders(providersObj);
        }

        console.log("UserStats --->", userStats)
        console.log("GlobalStats --->", globalStats)

        // Vérification de la session et des providers manquants
        const hasBluesky = !!session?.user?.bluesky_username
        const hasMastodon = !!session?.user?.mastodon_id
        const hasMissingProviders = refreshData.providers?.length > 0


        console.log("👤 [fetchData] User connection status:", {
          hasBluesky,
          hasMastodon,
          hasMissingProviders,
          missingProviders: refreshData.providers
        })

        // Si l'utilisateur n'a pas les deux services ou a des providers manquants
        if (!hasBluesky && !hasMastodon || hasMissingProviders) {
          if (!hasMissingProviders)
          {
            setMissingProviders({
              bluesky: !hasBluesky ? 'first_connect' : undefined,
              mastodon: !hasMastodon ? 'first_connect' : undefined
            })
          }
          else
          {
            // Convertir les providers du refresh token en objet avec status 'reconnection'
            const providersObj = refreshData.providers.reduce((acc, provider) => ({
              ...acc,
              [provider]: 'reconnection' as const
            }), {} as MissingProvidersType);
            setMissingProviders(providersObj);
          }
          console.log("⚠️ [fetchData] Missing providers:", refreshData.providers)
        } else {
          console.log("✅ [fetchData] User has all required connections, showing ReconnexionOptions")
          setShowOptions(true)
        }

        if (matchingData.error) {
          console.error("❌ [fetchData] Error fetching matches:", matchingData.error)
          return
        }

        const matches = matchingData.matches.following
        setAccountsToProcess(matches)

        setStats({
          userStats: {
            connections: userStats.connections,
            matches: userStats.matches,
            updated_at: userStats.updated_at
          },
          globalStats: {
            users: globalStats.users,
            connections: globalStats.connections,
            updated_at: globalStats.updated_at
          }
        })

        setGlobalStats(globalStats)

      } catch (error) {
        console.error('❌ [fetchData] Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id])

  useEffect(() => {
    const fetchMastodonInstances = async () => {
      try {
        const response = await fetch('/api/auth/mastodon')
        const data = await response.json()
        if (data.success) {
          setMastodonInstances(data.instances)
        }
      } catch (error) {
        console.error('Error fetching Mastodon instances:', error)
      }
    }

    fetchMastodonInstances()
  }, [])

  const checkTokens = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()

      if (!data.success) {
        setInvalidTokenProviders(data.providers || [])
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking tokens:', error)
      return false
    }
  }


  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <LoadingIndicator msg={t('loading')} />
      </div>
    )
  }

  // Fonction pour vérifier les tokens
  const handleAutomaticMode = async () => {
    setIsAutomaticReconnect(true)
    await updateAutomaticReconnect(true)
  }

  // Gestionnaire pour le mode manuel
  const handleManualMode = async () => {
    setIsAutomaticReconnect(false)
    await updateAutomaticReconnect(false)
  }

  const handleToggleAccount = (twitterId: string) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(twitterId)) {
        newSet.delete(twitterId)
      } else {
        newSet.add(twitterId)
      }
      return newSet
    })
  }

  const updateAutomaticReconnect = async (value: boolean) => {
    try {
      const response = await fetch('/api/users/automatic-reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ automatic_reconnect: value }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update automatic reconnect setting');
      }
      
      setIsAutomaticReconnect(value);
      // await updateSession(); // Met à jour la session avec les nouvelles données
    } catch (error) {
      console.error('Error updating automatic reconnect:', error);
    }
  };

  const handleAutomaticReconnection = async () => {
    await handleAutomaticMode();
    // Démarrer la migration automatique avec tous les comptes
    const allAccountIds = accountsToProcess.map(match => match.target_twitter_id);
    handleStartMigration(allAccountIds);
  };

  const handleManualReconnection = async () => {
    await handleManualMode();
    setShowOptions(false);
  };

  const toggleAutomaticReconnect = async () => {
    const newValue = !isAutomaticReconnect;
    await updateAutomaticReconnect(newValue);
    setIsAutomaticReconnect(newValue);
  };

  const handleStartMigration = async (selectedAccounts: string[]) => {
    try {
      setIsMigrating(true);
      console.log('Starting migration for accounts:', selectedAccounts);

      // Get all selected accounts
      const accountsToMigrate = accountsToProcess.filter(match => 
        selectedAccounts.includes(match.target_twitter_id)
      );

      // Initialize progress tracking with total matches
      const initialResults = {
        bluesky: {
          attempted: accountsToMigrate.filter(acc => !acc.has_follow_bluesky).length,
          succeeded: accountsToMigrate.filter(acc => acc.has_follow_bluesky).length
        },
        mastodon: {
          attempted: accountsToMigrate.filter(acc => !acc.has_follow_mastodon).length,
          succeeded: accountsToMigrate.filter(acc => acc.has_follow_mastodon).length
        }
      };
      setMigrationResults(initialResults);

      // Process in batches, excluding already followed accounts
      const BATCH_SIZE = 25;
      let remainingAccounts = accountsToMigrate.filter(acc => 
        (!acc.has_follow_bluesky && session?.user?.bluesky_username) || 
        (!acc.has_follow_mastodon && session?.user?.mastodon_username)
      );

      for (let i = 0; i < remainingAccounts.length; i += BATCH_SIZE) {
        const batchAccounts = remainingAccounts.slice(i, i + BATCH_SIZE);
        
        console.log('Sending batch to API:', batchAccounts);
        
        const response = await fetch('/api/migrate/send_follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accounts: batchAccounts }),
        });
        
        if (response.status === 500 && response.error === 'InvalidToken') {
          console.log('Invalid token detected during migration');
          setInvalidTokenProviders(['bluesky']);
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to process batch ${i / BATCH_SIZE + 1}`);
        }

        const result = await response.json();
        console.log('Results from send_follow:', result);

        // Update progress based on batch results
        setMigrationResults(prevResults => {
          if (!prevResults) return initialResults;

          return {
            bluesky: {
              attempted: prevResults.bluesky.attempted,
              succeeded: prevResults.bluesky.succeeded + (result.bluesky?.succeeded || 0)
            },
            mastodon: {
              attempted: prevResults.mastodon.attempted,
              succeeded: prevResults.mastodon.succeeded + (result.mastodon?.succeeded || 0)
            }
          };
        });
      }

      // Update user stats after migration is complete
      try {
        await fetch('/api/update/user_stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Error updating user stats:', error);
      }

      // Migration completed
      // if (isAutomaticReconnect) {
        setIsReconnectionComplete(true);
      // }
      setIsMigrating(false);
      
      // Refresh the session to update follow status
      // await updateSession();
    } catch (error) {
      console.error('Error during migration:', error);
      setIsMigrating(false);
    }
  };

  const refreshStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const newStats = await response.json()
        console.log("API response stats:", newStats)
        setStats({
          userStats: {
            connections: newStats.connections,
            matches: newStats.matches,
            updated_at: newStats.updated_at
          },
          globalStats: {
            users: newStats.globalStats.users,
            connections: newStats.globalStats.connections,
            updated_at: newStats.globalStats.updated_at
          }
        })
      }
    } catch (error) {
      console.error('Error refreshing stats:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#ebece7] mt-4 relative w-full max-w-[80rem] m-auto">
      <div className="relative z-40">
        <Header />
      </div>
      <div className="absolute inset-0 w-auto h-full ">
      <DashboardSea />

      <div className="relative min-h-[calc(100vh-4rem)] pt-80 ">
      <div className="max-w-[78rem] mx-auto px-4 bg-[#2a39a9]">
      {/* <div className="max-w-2xl mx-auto "> */}
            <Suspense fallback={<div className="animate-pulse bg-blue-900/50 h-24" />}>
              <MigrateStats
                  stats={stats?.userStats ?? null}
                  session={{
                    user: {
                      twitter_username: session?.user?.twitter_username ?? "",
                      bluesky_username: session?.user?.bluesky_username ?? "",
                      mastodon_username: session?.user?.mastodon_username ?? ""
                    }
                  }}
              />
            </Suspense>
          </div>

          
          <div className="max-w-[78rem] mx-auto bg-[#2a39a9]">
            {Object.keys(missingProviders).length > 0 ? (
                
                <div className="bg-[#2a39a9] rounded-xl p-8 mx-auto">
                <DashboardLoginButtons
                  missingProviders={missingProviders}
                  hasUploadedArchive={true}
                  onLoadingChange={setIsLoading}
                  mastodonInstances={mastodonInstances}
                  session={{
                    user: {
                      twitter_needed : session?.user?.twitter_username ?? null,
                      bluesky_username: session?.user?.bluesky_username ?? "",
                      mastodon_id: session?.user?.mastodon_id ?? ""
                    }
                  }}
                  stats={stats?.userStats ?? null}
                />
              </div>
            ) : (
              <Suspense fallback={<LoadingIndicator msg="Loading..." />}>
                {isReconnectionComplete && session && stats ? (
                    <SuccessAutomaticReconnexion
                      session={{
                        user: {
                          twitter_username: session.user?.twitter_username || session.user?.bluesky_username || session.user?.mastodon_username || '',
                          bluesky_username: session.user.bluesky_username ?? "",
                          mastodon_username: session.user.mastodon_username ?? ""
                        }
                      }}
                      stats={stats.userStats}
                      onSuccess={refreshStats}
                    />
              // ) : stats?.matches?.bluesky?.notFollowed === 0 && stats?.matches?.mastodon?.notFollowed === 0 ? (
              //   <SuccessAutomaticReconnexion
              //     session={{
              //       user: {
              //         twitter_username: session?.user?.twitter_username ?? "",
              //         bluesky_username: session?.user?.bluesky_username ?? "",
              //         mastodon_username: session?.user?.mastodon_username ?? ""
              //       }
              //     }}
              //     stats={stats}
              //     onSuccess={refreshStats}
              //           />
                      ) : isAutomaticReconnect ? (
                        <AutomaticReconnexion
                  results={migrationResults || { bluesky: { attempted: 0, succeeded: 0 }, mastodon: { attempted: 0, succeeded: 0 } }}
                  onPause={toggleAutomaticReconnect}
                  session={{
                    user: {
                      bluesky_username: session?.user?.bluesky_username ?? null,
                      mastodon_username: session?.user?.mastodon_username ?? null
                    }
                  }}
                  stats={{
                    bluesky_matches: stats?.userStats.matches.bluesky.total ?? 0,
                    mastodon_matches: stats?.userStats.matches.mastodon.total ?? 0,
                    matched_following: stats?.userStats.connections.following ?? 0
                  }}
                />
              ) : showOptions ? (
                
                <ReconnexionOptions
                  onAutomatic={handleAutomaticReconnection}
                  onManual={handleManualReconnection}
                  globalStats={globalStats}
                        />

              
                      ) : (
                        <ManualReconnexion
                  matches={accountsToProcess}
                  onStartMigration={handleStartMigration}
                  onToggleAutomaticReconnect={handleAutomaticReconnection}
                  session={{
                    user: {
                      bluesky_username: session?.user?.bluesky_username ?? null,
                      mastodon_username: session?.user?.mastodon_username ?? null
                    }
                  }}
                        />
                      )}
              </Suspense>
            )}
          </div>

          <Footer />
        </div>
      </div>
    {/* </div> */}
    </div>
  )
}