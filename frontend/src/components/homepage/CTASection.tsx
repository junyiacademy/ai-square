"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  const { t } = useTranslation("homepage");

  return (
    <section className="py-24 bg-[#0363A7]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t("cta.title")}
          </h2>

          <p className="mt-4 text-lg text-blue-100">
            {t("cta.subtitle")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#0363A7] bg-white rounded-xl hover:bg-blue-50 transition-colors duration-200 shadow-sm cursor-pointer"
            >
              {t("cta.button")}
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            >
              {t("cta.login")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
