'use client';

import Image from 'next/image';
import { plex, caveat } from '@/app/fonts/plex';
import localFont from 'next/font/local';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { FaCheck } from "react-icons/fa";

import logo from '../../../public/logo/logo-openport-rose.svg';
import seaBackground from '../../../public/sea.svg';
import arrowGrowth from '../../../public/v2/uil_arrow-growth.svg';
import chainon from '../../../public/v2/chainon.svg';
import Boat from './Boat';
// import MigrateStats from './MigrateStats';

const syneTactile = localFont({
  src: '../fonts/SyneTactile-Regular.ttf',
  display: 'swap',
});

interface SeaProps {
  stats?: {
    total_following: number;
    matched_following: number;
    bluesky_matches: number;
    mastodon_matches: number;
  } | null;
}


export default function MigrateSea({ stats }: SeaProps) {
  const t = useTranslations('migrateSea');
  const params = useParams();

  const Boats = () => {
    return (
      <div className="w-full relative">
        {/* Bateau de gauche - visible uniquement sur écran large */}
        <div className="hidden md:block">
          <Boat model={2} top={145} left={9} scale={2} zindex={1} />
        </div>
        
        {/* Bateau du milieu - toujours visible */}
        <Boat model={3} top={130} left={42} scale={2} zindex={1} />
        
        {/* Bateau de droite - visible uniquement sur écran large */}
        <div className="hidden md:block">
          <Boat model={4} top={180} left={77} scale={2} zindex={1} />
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[20rem] min-w-full">
      <Image src={seaBackground} fill alt="" className="object-cover" />

      <div className="relative z-[5] w-full">
        <Image
          src={logo}
          alt="OpenPortability Logo"
          width={306}
          height={125}
          className="mx-auto"
        />
        {/* <div className="w-full relative">
          <Boats />
        </div> */}
      </div>
    </div>
  );
}