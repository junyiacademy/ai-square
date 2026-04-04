"use client";

import React from "react";
import dynamic from "next/dynamic";
import DiscoveryPageLayout from "@/components/discovery/DiscoveryPageLayout";
import { useDiscoveryData } from "@/hooks/useDiscoveryData";
import { useTranslation } from "react-i18next";

function AchievementsLoadingFallback() {
  const { t } = useTranslation("discovery");
  return <div className="text-center py-8">{t("scenarioDetail.loading")}</div>;
}

// Dynamic import to avoid SSR issues
const AchievementsView = dynamic(
  () => import("@/components/discovery/AchievementsView"),
  {
    ssr: false,
    loading: AchievementsLoadingFallback,
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
