'use client';

import { useTranslations } from 'next-intl';
import { FaCheck } from "react-icons/fa";
import Image from 'next/image';
import { plex, caveat } from '@/app/fonts/plex';
import arrowGrowth from '../../../public/v2/uil_arrow-growth.svg';
import chainon from '../../../public/v2/chainon.svg';
import localFont from 'next/font/local';
import { UserCompleteStats } from '@/lib/types/stats';

interface StatsProps {
  session: {
    user: {
      twitter_username: string;
      bluesky_username?: string;
      mastodon_username?: string;
    };
  };
  stats?: UserCompleteStats | null;
}

const syneTactile = localFont({
  src: '../fonts/SyneTactile-Regular.ttf',
  display: 'swap',
});

export default function MigrateStats({ stats, session }: StatsProps) {
  const t = useTranslations('migrateSea');

  console.log("stats from MigrateStats", stats)

  if (!stats) return null;

  const totalToFollow = stats.matches.bluesky.notFollowed + stats.matches.mastodon.notFollowed;
  const totalFollowed = stats.matches.bluesky.hasFollowed + stats.matches.mastodon.hasFollowed;

  return (
    <div className="mt-12 bg-[#2a39a9] max-w-[78rem] mx-auto">
      <h1 className={`${syneTactile.className} bg-[#2a39a9] text-[5rem] text-[#d6356f] z-[15] text-center font-bold`}>
        {t('title')}
      </h1>

      <div className="flex items-center justify-center gap-2 bg-[#2a39a9]">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className={`${plex.className} text-[80px] text-[#66D9E8] font-bold`}>
              {totalToFollow}
            </span>
            <Image src={arrowGrowth} alt="" width={30} height={30} />
          </div>
          <p className={`${plex.className} text-white text-center text-sm mt-2 max-w-[250px] whitespace-pre-line`}>
            {t('stats.awaitingConnection')}
          </p>
        </div>

        <Image src={chainon} alt="" width={100} height={100} className="mx-4" />

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className={`${plex.className} text-[80px] text-[#6fce97] font-bold`}>
              {totalFollowed}
            </span>
            <FaCheck className="text-[#6fce97] text-3xl" />
          </div>
          <p className={`${plex.className} text-white text-center text-sm mt-2 max-w-[250px] whitespace-pre-line`}>
            {t('stats.alreadyTransferred')}
          </p>
        </div>
      </div>

      {/* <div className="flex justify-center gap-8 mt-8">
        <div className="text-center">
          <span className={`${plex.className} text-[#66D9E8] font-bold`}>
            {t('matchDetails.bluesky', { count: stats.matches.bluesky.total })}
          </span>
        </div>
        <div className="text-center">
          <span className={`${plex.className} text-[#66D9E8] font-bold`}>
            {t('matchDetails.mastodon', { count: stats.matches.mastodon.total })}
          </span>
        </div>
      </div> */}
    </div>
  );
}