"use client";

import { useTranslation } from "react-i18next";
import { ClipboardList, BookOpen, TrendingUp } from "lucide-react";

const steps = [
  { key: "assess", icon: ClipboardList, number: "01" },
  { key: "learn", icon: BookOpen, number: "02" },
  { key: "grow", icon: TrendingUp, number: "03" },
];

export default function HowItWorksSection() {
  const { t } = useTranslation("homepage");

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E293B]">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-4 text-lg text-[#64748B] max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="relative text-center">
                {/* Connector line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[calc(100%-20%)] h-px bg-[#E2E8F0]" />
                )}

                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#E8F4FD] rounded-2xl mb-6">
                  <Icon className="w-7 h-7 text-[#0363A7]" />
                </div>

                <div className="text-xs font-semibold text-[#0363A7] tracking-widest uppercase mb-2">
                  {step.number}
                </div>

                <h3 className="text-xl font-semibold text-[#1E293B] mb-3">
                  {t(`howItWorks.steps.${step.key}.title`)}
                </h3>

                <p className="text-[#64748B] leading-relaxed">
                  {t(`howItWorks.steps.${step.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
