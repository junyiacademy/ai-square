"use client";

import React from "react";
import dynamic from "next/dynamic";
import DiscoveryPageLayout from "@/components/discovery/DiscoveryPageLayout";
import { useDiscoveryData } from "@/hooks/useDiscoveryData";

// Dynamic import to avoid SSR issues
const AchievementsView = dynamic(
  () => import("@/components/discovery/AchievementsView"),
  {
    ssr: false,
    loading: () => <div className="text-center py-8">載入中...</div>,
  },
);

export default function AchievementsPage() {
  const { achievements } = useDiscoveryData();

  return (
    <DiscoveryPageLayout>
      <AchievementsView achievements={achievements} />
    </DiscoveryPageLayout>
  );
}
