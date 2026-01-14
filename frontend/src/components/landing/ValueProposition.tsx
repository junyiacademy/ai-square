"use client";

import React from "react";

/**
 * Value Proposition Section
 * Three gradient icon cards representing key stakeholders:
 * Students, Teachers, and Institutions
 */
export default function ValueProposition() {
  const values = [
    {
      icon: "👨‍🎓",
      title: "學生",
      description: "個人化學習路徑，AI 即時回饋，讓學習更有效率",
      gradient: "from-primary-blue to-accent-blue-light",
      iconBg: "bg-primary-blue",
    },
    {
      icon: "👩‍🏫",
      title: "教師",
      description: "智慧教學輔助，減輕批改負擔，專注教學品質",
      gradient: "from-secondary-orange to-accent-orange-light",
      iconBg: "bg-secondary-orange",
    },
    {
      icon: "🏫",
      title: "機構",
      description: "完整數據分析，追蹤學習成效，優化教育資源",
      gradient: "from-primary-blue via-purple-500 to-secondary-orange",
      iconBg: "bg-gradient-blue-orange",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-h1 text-gray-900 mb-4">為誰而設計</h2>
            <p className="text-h4 text-gray-600 max-w-2xl mx-auto">
              三位一體的教育生態系，滿足不同角色的需求
            </p>
          </div>

          {/* Value cards grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                {/* Gradient background on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  aria-hidden="true"
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 ${value.iconBg} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-md group-hover:scale-110 transition-transform duration-300`}
                  >
                    <span role="img" aria-label={value.title}>
                      {value.icon}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-h3 text-gray-900 mb-4 font-semibold">
                    {value.title}
                  </h3>

                  {/* Description */}
                  <p className="text-h5 text-gray-600 leading-relaxed">
                    {value.description}
                  </p>

                  {/* Learn more link */}
                  <div className="mt-6">
                    <span
                      className={`inline-flex items-center text-h6 font-semibold bg-gradient-to-r ${value.gradient} bg-clip-text text-transparent group-hover:gap-2 transition-all duration-300`}
                    >
                      了解更多
                      <svg
                        className="w-5 h-5 ml-1 text-gray-400 group-hover:translate-x-1 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
