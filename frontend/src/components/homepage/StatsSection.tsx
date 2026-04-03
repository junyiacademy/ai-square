"use client";

import { useTranslation } from "react-i18next";
import { Globe, Layers, Award, Headphones } from "lucide-react";

const stats = [
  { key: "languages", value: "14", icon: Globe },
  { key: "domains", value: "4", icon: Layers },
  { key: "competencies", value: "20+", icon: Award },
  { key: "aiSupport", value: "24/7", icon: Headphones },
];

export default function StatsSection() {
  const { t } = useTranslation("homepage");

  return (
    <section className="py-12 bg-white border-y border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.key} className="flex flex-col items-center text-center">
                <Icon className="w-6 h-6 text-[#0363A7] mb-3" />
                <div className="text-3xl font-bold text-[#1E293B]">{stat.value}</div>
                <div className="text-sm text-[#64748B] mt-1">{t(`stats.${stat.key}`)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
