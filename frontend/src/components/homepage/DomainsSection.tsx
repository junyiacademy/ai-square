"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { MessageCircle, Palette, Settings, Cpu } from "lucide-react";

const domains = [
  { key: "engaging", icon: MessageCircle, color: "#3B82F6", bgColor: "#EFF6FF" },
  { key: "creating", icon: Palette, color: "#10B981", bgColor: "#ECFDF5" },
  { key: "managing", icon: Settings, color: "#F59E0B", bgColor: "#FFFBEB" },
  { key: "designing", icon: Cpu, color: "#EF4444", bgColor: "#FEF2F2" },
];

export default function DomainsSection() {
  const { t } = useTranslation("homepage");

  return (
    <section className="py-24 bg-[#F1F5F9]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E293B]">
            {t("domains.title")}
          </h2>
          <p className="mt-4 text-lg text-[#64748B] max-w-2xl mx-auto">
            {t("domains.subtitle")}
          </p>
        </div>

        {/* Domain grid with center AI node */}
        <div className="relative max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {domains.map((domain) => {
              const Icon = domain.icon;
              return (
                <Link
                  key={domain.key}
                  href="/relations"
                  className="group bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl"
                      style={{ backgroundColor: domain.bgColor }}
                    >
                      <Icon className="w-6 h-6" style={{ color: domain.color }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E293B] mb-1">
                        {t(`domains.items.${domain.key}.name`)}
                      </h3>
                      <p className="text-sm text-[#64748B] leading-relaxed">
                        {t(`domains.items.${domain.key}.description`)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
