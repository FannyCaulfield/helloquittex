'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export default function ImportExplanation() {
    const t = useTranslations('dashboard');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 max-w-md flex flex-col space-y-4 py-4 bg-[#2a39a9] rounded-lg"
    >
      <div className="relative px-6 py-4">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm rounded-lg" />
        <p className="text-indigo-200 text-justify relative z-10 leading-relaxed">
          {t('importExplanation')}
        </p>
      </div>
    </motion.div>
  );
}