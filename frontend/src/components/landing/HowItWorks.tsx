"use client";

import React from "react";

/**
 * How It Works Section
 * Beam timeline visualization (Blue → Gradient → Orange)
 * Shows the learning journey progression
 */
export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "評量診斷",
      description: "AI 分析學習狀況，精準定位知識缺口",
      color: "blue",
    },
    {
      number: "02",
      title: "個人化學習",
      description: "依據評量結果，推薦適合的學習路徑",
      color: "gradient",
    },
    {
      number: "03",
      title: "持續成長",
      description: "專題實踐與探索，建立完整知識體系",
      color: "orange",
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          bg: "bg-primary-blue",
          text: "text-primary-blue",
          border: "border-primary-blue",
        };
      case "orange":
        return {
          bg: "bg-secondary-orange",
          text: "text-secondary-orange",
          border: "border-secondary-orange",
        };
      default:
        return {
          bg: "bg-gradient-blue-orange",
          text: "text-transparent bg-gradient-blue-orange bg-clip-text",
          border: "border-purple-400",
        };
    }
  };

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-20">
            <h2 className="text-h1 text-gray-900 mb-4">如何運作</h2>
            <p className="text-h4 text-gray-600 max-w-2xl mx-auto">
              從診斷到成長，三步驟啟動智慧學習
            </p>
          </div>

          {/* Timeline with beam effect */}
          <div className="relative">
            {/* Beam line - Blue to Orange gradient */}
            <div className="absolute top-20 left-0 right-0 h-1 hidden lg:block">
              <div className="relative h-full">
                {/* Base line */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-blue via-purple-400 to-secondary-orange opacity-20 rounded-full" />
                {/* Animated beam */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-blue via-purple-400 to-secondary-orange rounded-full animate-pulse" />
              </div>
            </div>

            {/* Steps */}
            <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
              {steps.map((step, index) => {
                const colors = getColorClasses(step.color);
                return (
                  <div
                    key={index}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Step number circle */}
                    <div
                      className={`relative z-10 w-40 h-40 ${colors.bg} rounded-full flex items-center justify-center shadow-xl mb-8 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <span className="text-6xl font-bold text-white">
                        {step.number}
                      </span>
                    </div>

                    {/* Content card */}
                    <div className="relative">
                      <h3 className={`text-h2 ${colors.text} mb-4 font-semibold`}>
                        {step.title}
                      </h3>
                      <p className="text-h5 text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Connection arrow (mobile) */}
                    {index < steps.length - 1 && (
                      <div className="lg:hidden my-8">
                        <svg
                          className="w-8 h-8 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-20 text-center">
            <button className="px-10 py-5 bg-gradient-blue-orange text-white text-h4 rounded-full font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-50">
              立即開始學習旅程
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
