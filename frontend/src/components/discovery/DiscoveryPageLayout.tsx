"use client";

import React from "react";
import DiscoveryHeader from "@/components/discovery/DiscoveryHeader";
import { useDiscoveryData } from "@/hooks/useDiscoveryData";

interface DiscoveryPageLayoutProps {
  children: React.ReactNode;
}

export default function DiscoveryPageLayout({
  children,
}: DiscoveryPageLayoutProps) {
  const { isLoading, achievementCount } = useDiscoveryData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <DiscoveryHeader
        achievementCount={achievementCount}
        workspaceCount={0}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
