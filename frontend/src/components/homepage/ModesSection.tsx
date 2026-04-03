"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { ClipboardCheck, FolderKanban, Compass, ArrowRight } from "lucide-react";

const modes = [
  {
    key: "assessment",
    href: "/assessment",
    icon: ClipboardCheck,
    color: "#0363A7",
    bgColor: "#E8F4FD",
  },
  {
    key: "pbl",
    href: "/pbl",
    icon: FolderKanban,
    color: "#059669",
    bgColor: "#ECFDF5",
  },
  {
    key: "discovery",
    href: "/discovery",
    icon: Compass,
    color: "#EC6C1F",
    bgColor: "#FEF3EC",
  },
];

export default function ModesSection() {
  const { t } = useTranslation("homepage");

  return (
    <section className="py-24 bg-[#FAFBFC]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E293B]">
            {t("modes.title")}
          </h2>
          <p className="mt-4 text-lg text-[#64748B] max-w-2xl mx-auto">
            {t("modes.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.key}
                href={mode.href}
                className="group relative bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6"
                  style={{ backgroundColor: mode.bgColor }}
                >
                  <Icon className="w-7 h-7" style={{ color: mode.color }} />
                </div>

                <h3 className="text-xl font-semibold text-[#1E293B] mb-3">
                  {t(`modes.${mode.key}.title`)}
                </h3>

                <p className="text-[#64748B] leading-relaxed mb-6">
                  {t(`modes.${mode.key}.description`)}
                </p>

                <span
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200"
                  style={{ color: mode.color }}
                >
                  {t(`modes.${mode.key}.cta`)}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
