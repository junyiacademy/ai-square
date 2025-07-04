'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import WelcomeScreen from '@/components/discovery/WelcomeScreen';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';

export default function OverviewPage() {
  const router = useRouter();

  const handleStartJourney = () => {
    router.push('/discovery/evaluation');
  };

  return (
    <DiscoveryPageLayout>
      <WelcomeScreen onStartJourney={handleStartJourney} />
    </DiscoveryPageLayout>
  );
}