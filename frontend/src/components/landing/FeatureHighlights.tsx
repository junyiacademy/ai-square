"use client";

import React from "react";

/**
 * Feature Highlights Section
 * 2x2 Bento grid forming X pattern visual motif
 * Showcases key platform capabilities
 */
export default function FeatureHighlights() {
  const features = [
    {
      title: "智慧評量",
      description: "AI 自動評分，即時反饋，精準診斷學習弱點",
      icon: "📊",
      color: "blue",
      position: "top-left",
    },
    {
      title: "專題導向學習",
      description: "真實情境問題，培養批判思考與解決問題能力",
      icon: "🎯",
      color: "orange",
      position: "top-right",
    },
    {
      title: "探索模式",
      description: "引導式學習，激發好奇心，建立知識網絡",
      icon: "🔍",
      color: "orange",
      position: "bottom-left",
    },
    {
      title: "數據洞察",
      description: "完整學習歷程追蹤，視覺化分析，優化教學策略",
      icon: "📈",
      color: "blue",
      position: "bottom-right",
    },
  ];

  const getColorClasses = (color: string) => {
    if (color === "blue") {
      return {
        bg: "bg-primary-blue",
        border: "border-primary-blue",
        text: "text-primary-blue",
        hover: "group-hover:border-primary-blue",
        gradient: "from-primary-blue to-accent-blue-light",
      };
    }
    return {
      bg: "bg-secondary-orange",
      border: "border-secondary-orange",
      text: "text-secondary-orange",
      hover: "group-hover:border-secondary-orange",
      gradient: "from-secondary-orange to-accent-orange-light",
    };
  };

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-h1 text-gray-900 mb-4">核心功能</h2>
            <p className="text-h4 text-gray-600 max-w-2xl mx-auto">
              三大學習模式，一個智慧平台
            </p>
          </div>

          {/* Bento grid - 2x2 forming X pattern */}
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const colors = getColorClasses(feature.color);
              return (
                <div
                  key={index}
                  className={`group relative bg-white rounded-3xl p-8 lg:p-12 border-2 border-gray-100 ${colors.hover} hover:shadow-2xl transition-all duration-500 hover:-translate-y-1`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                    aria-hidden="true"
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div
                      className={`w-20 h-20 ${colors.bg} rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                    >
                      <span role="img" aria-label={feature.title}>
                        {feature.icon}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-h2 text-gray-900 mb-4 font-semibold">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-h5 text-gray-600 leading-relaxed mb-6">
                      {feature.description}
                    </p>

                    {/* Decorative line forming X pattern */}
                    <div
                      className={`h-1 w-16 ${colors.bg} rounded-full opacity-30 group-hover:opacity-100 group-hover:w-24 transition-all duration-500`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual X pattern indicator */}
          <div className="relative mt-16 h-32" aria-hidden="true">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full max-w-2xl h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-blue-orange rounded-full opacity-20 blur-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
