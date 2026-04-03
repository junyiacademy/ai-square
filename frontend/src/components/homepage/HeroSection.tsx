"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  const { t } = useTranslation("homepage");

  return (
    <section className="relative overflow-hidden bg-[#FAFBFC] pt-32 pb-24">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0363A7]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#EC6C1F]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1E293B] tracking-tight leading-[1.1]">
            {t("hero.title")}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[#64748B] leading-relaxed max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-[#0363A7] rounded-xl hover:bg-[#024e85] transition-colors duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              {t("hero.cta.getStarted")}
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/discovery"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F1F5F9] transition-colors duration-200 shadow-sm cursor-pointer"
            >
              {t("hero.cta.explore")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
