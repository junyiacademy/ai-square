"use client";

import React from "react";
import GlassCard from "@/components/ui/GlassCard";

/**
 * Target Audience Section
 * Persona cards with photography representing humanity
 * Shows real use cases for different user types
 */
export default function TargetAudience() {
  const personas = [
    {
      name: "國中生 - 小明",
      role: "自主學習者",
      quote: "AI 評量讓我知道自己哪裡不懂，學習變得更有方向！",
      emoji: "👦",
      stats: [
        { label: "完成評量", value: "120+" },
        { label: "專題完成", value: "15" },
        { label: "學習時數", value: "80h" },
      ],
    },
    {
      name: "數學老師 - 王老師",
      role: "教學創新者",
      quote: "減少批改時間，我能更專注在引導學生思考。",
      emoji: "👩‍🏫",
      stats: [
        { label: "學生人數", value: "150" },
        { label: "節省時間", value: "40%" },
        { label: "滿意度", value: "95%" },
      ],
    },
    {
      name: "教務主任 - 林主任",
      role: "教育決策者",
      quote: "完整數據讓我們能更精準地分配教學資源。",
      emoji: "👨‍💼",
      stats: [
        { label: "追蹤班級", value: "20" },
        { label: "資料準確", value: "99%" },
        { label: "效率提升", value: "60%" },
      ],
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background decoration */}
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-gradient-blue-radial opacity-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-orange-radial opacity-10"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-h1 text-gray-900 mb-4">真實使用者故事</h2>
            <p className="text-h4 text-gray-600 max-w-2xl mx-auto">
              來自學生、教師、教育決策者的真實反饋
            </p>
          </div>

          {/* Persona cards */}
          <div className="grid lg:grid-cols-3 gap-8">
            {personas.map((persona, index) => (
              <GlassCard
                key={index}
                variant={index === 1 ? "blue" : index === 2 ? "orange" : "default"}
                className="relative"
              >
                {/* Emoji avatar */}
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl shadow-lg">
                    <span role="img" aria-label={persona.name}>
                      {persona.emoji}
                    </span>
                  </div>
                </div>

                {/* Name and role */}
                <div className="text-center mb-6">
                  <h3 className="text-h3 text-gray-900 font-semibold mb-2">
                    {persona.name}
                  </h3>
                  <p className="text-h5 text-gray-600">{persona.role}</p>
                </div>

                {/* Quote */}
                <blockquote className="text-center mb-8">
                  <p className="text-h5 text-gray-700 italic leading-relaxed">
                    &ldquo;{persona.quote}&rdquo;
                  </p>
                </blockquote>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                  {persona.stats.map((stat, statIndex) => (
                    <div key={statIndex} className="text-center">
                      <div className="text-h3 font-bold text-primary-blue mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-16 text-center">
            <p className="text-h5 text-gray-600 mb-4">超過 5,000 位使用者的選擇</p>
            <div className="flex justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-8 h-8 text-secondary-orange"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-2 text-h5 text-gray-700 font-semibold">
                4.9/5.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
