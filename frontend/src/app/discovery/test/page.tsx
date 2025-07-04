'use client';

import React from 'react';
import DiscoveryNavigation from '@/components/layout/DiscoveryNavigation';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Discovery Test Page</h1>
        <p className="text-gray-600">This is a test page to verify Discovery navigation works.</p>
      </div>
      
      <DiscoveryNavigation />
    </div>
  );
}