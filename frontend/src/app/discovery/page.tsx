'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiscoveryPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the overview page which is the new entry point
    router.replace('/discovery/overview');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">正在載入...</p>
      </div>
    </div>
  );
}