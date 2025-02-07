'use client'

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { signIn } from "next-auth/react"
import { useTranslations } from 'next-intl'
import { Loader2, AlertCircle, Lock, User, ChevronDown, Plus } from 'lucide-react'
import { plex } from "@/app/fonts/plex"
import { BskyAgent } from '@atproto/api'
import Image from 'next/image'
import BlueSkyLogin from './BlueSkyLogin'
import MastodonLoginButton from './MastodonLoginButton'
import { UserCompleteStats } from '@/lib/types/stats';

import mastodonIcon from '../../../public/newSVG/masto.svg'
import blueskyIcon from '../../../public/newSVG/BS.svg'
import twitterIcon from '../../../public/newSVG/X.svg'

type ProviderStatus = 'reconnection' | 'first_connect';
type MissingProvidersType = {
  [key in 'bluesky' | 'mastodon']?: ProviderStatus;
};

interface DashboardLoginButtonsProps {
  missingProviders: MissingProvidersType;
  hasUploadedArchive: boolean;
  onLoadingChange: (isLoading: boolean) => void;
  mastodonInstances: string[];
  session?: {
    user?: {
      twitter_needed : string | null;
      bluesky_username?: string | null;
      mastodon_id?: string | null;
    }
  };
  stats?: UserCompleteStats | null;
}

export default function DashboardLoginButtons({
  missingProviders,
  hasUploadedArchive,
  onLoadingChange,
  mastodonInstances,
  session,
  stats
}: DashboardLoginButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [instanceText, setInstanceText] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const t = useTranslations('dashboardLoginButtons')

  const identifierRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  console.log('🔑 [DashboardLoginButtons] Missing providers:', missingProviders)

  // Compter les providers par type
  const firstConnectCount = Object.values(missingProviders).filter(status => status === 'first_connect').length;
  const reconnectionCount = Object.values(missingProviders).filter(status => status === 'reconnection').length;

  // Fonction pour obtenir le texte du bouton en fonction du statut
  const getButtonText = (provider: 'bluesky' | 'mastodon') => {
    const status = missingProviders[provider];
    if (status === 'first_connect') {
      return t(`firstConnection.${provider}Stats.before`);
    } else if (status === 'reconnection') {
      return t(`reconnection.${provider}`);
    }
    return t(`connectedDashboard.${provider}`);
  };

  // Détermine si on doit afficher un provider
  const shouldShowProvider = (provider: 'bluesky' | 'mastodon') => {
    if (firstConnectCount === 2) {
      // Si les deux sont en first_connect, on montre tout
      return true;
    } else if (reconnectionCount > 0 && firstConnectCount === 0) {
      // Si que des reconnections, on montre les reconnections
      return missingProviders[provider] === 'reconnection';
    } else if (reconnectionCount > 0 && firstConnectCount > 0) {
      // Si mix, on montre que les reconnections
      return missingProviders[provider] === 'reconnection';
    }
    return false;
  };

  const handleTwitterSignIn = async () => {
    setIsLoading(true)
    onLoadingChange(true)
    try {
      await signIn('twitter', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Error signing in with Twitter:', error)
    }
    setIsLoading(false)
    onLoadingChange(false)
  }

  const handleMastodonSignIn = async () => {
    if (!instanceText) {
      setError(t('services.mastodon.error.missing_instance'))
      return
    }

    setIsLoading(true)
    onLoadingChange(true)
    try {
      await signIn('mastodon', {
        instance: instanceText,
        callbackUrl: '/dashboard',
      })
    } catch (error) {
      console.error('Error signing in with Mastodon:', error)
    }
    setIsLoading(false)
    onLoadingChange(false)
  }

  const renderServiceButton = (service: string, icon: string, label: string) => (
    <motion.button
      variants={{
        hidden: {
          opacity: 0,
          y: 20,
        },
        visible: {
          opacity: 1,
          y: 0,
        },
      }}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        if (service === 'twitter') {
          handleTwitterSignIn()
        } else {
          setSelectedService(selectedService === service ? null : service)
        }
      }}
      disabled={isLoading}
      className="w-full flex text-left justify-between px-8 py-4 bg-white rounded-full text-black font-medium hover:bg-gray-50 transition-colors relative overflow-hidden group"
    >
      <div className="flex gap-3 text-left items-start">
        <Image src={icon} alt={service} width={24} height={24} />
        <span>{label}</span>
      </div>
      <span className="text-gray-400 group-hover:text-black transition-colors">›</span>
    </motion.button>
  )

  return (
    <div className="flex flex-col gap-6 mx-auto max-w-[50rem] w-full">
      {/* Title and Stats Grid */}
      <div className="grid grid-cols-1 gap-4 text-center">
        <h2 className={`${plex.className} text-2xl font-semibold text-white`}>
          {(!session?.user?.bluesky_username && !session?.user?.mastodon_id)
            ? t('firstConnection.title')
            : t('reconnection.title')
          }
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-100">
          <div>
            {(!session?.user?.bluesky_username && stats?.matches?.bluesky.total && stats.matches.bluesky.total > 0) && (
              <p>
                {t('firstConnection.blueskyStats.before')}{' '}
                <span className="font-bold">{stats.matches.bluesky.total}</span>{' '}
                {t('firstConnection.blueskyStats.after')}
              </p>
            )}
            {(!missingProviders.bluesky && session?.user?.bluesky_username) && (
              <p>{t('reconnection.bluesky')}</p>
            )}
          </div>
          <div>
            {(!session?.user?.mastodon_id && stats?.matches?.mastodon.total && stats.matches.mastodon.total > 0) && (
              <p>
                {t('firstConnection.mastodonStats.before')}{' '}
                <span className="font-bold">{stats.matches.mastodon.total}</span>{' '}
                {t('firstConnection.mastodonStats.after')}
              </p>
            )}
            {(!missingProviders.mastodon && session?.user?.mastodon_id) && (
              <p>{t('reconnection.mastodon')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Login Buttons Grid */}
      <div className={`grid gap-4 w-full ${
        // Si on a Twitter + un seul autre bouton OU un seul bouton sans Twitter
        ((!session?.user?.twitter_needed && (shouldShowProvider('bluesky') !== shouldShowProvider('mastodon'))) || 
         (session?.user?.twitter_needed && shouldShowProvider('bluesky') && shouldShowProvider('mastodon')))
        ? 'grid-cols-1' // Une seule colonne
        : 'grid-cols-1 md:grid-cols-2' // Deux colonnes sur desktop
      }`}>
        {!session?.user?.twitter_needed && (
          <div className="col-span-1">
            {renderServiceButton('twitter', twitterIcon, t('connectedDashboard.twitter'))}
          </div>
        )}

        {shouldShowProvider('bluesky') && (
          <div className="col-span-1">
            <BlueSkyLogin
              onLoadingChange={onLoadingChange}
              buttonText={getButtonText('bluesky')}
            />
          </div>
        )}
        
        {shouldShowProvider('mastodon') && (
          <div className="col-span-1">
            <MastodonLoginButton
              onLoadingChange={onLoadingChange}
              buttonText={getButtonText('mastodon')}
              mastodonInstances={mastodonInstances}
            />
          </div>
        )}
      </div>
    </div>
  )
}
