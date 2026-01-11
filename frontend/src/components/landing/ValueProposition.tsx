"use client";

import { GlassCard } from "@/components/ui/GlassCard";

export function ValueProposition() {
  const values = [
    {
      title: "Personal Growth",
      description:
        "Develop AI literacy at your own pace with personalized learning paths tailored to your goals.",
      gradient: "bg-secondary-orange-500",
      icon: (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      title: "Tech Professional",
      description:
        "Master AI tools and techniques used by industry leaders. Build real-world projects and skills.",
      gradient: "bg-primary-blue-500",
      icon: (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      title: "Future Ready",
      description:
        "Stay ahead of AI trends and prepare for the evolving landscape of technology and society.",
      gradient: "bg-gradient-tech-to-human",
      icon: (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-20 px-4 bg-neutral-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-h1 font-bold text-neutral-textPrimary mb-4">
            Why AI Square?
          </h2>
          <p className="text-body text-neutral-textSecondary max-w-2xl mx-auto">
            A unique learning platform that balances technical excellence with
            human-centered design.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <GlassCard key={index} className="space-y-6">
              <div
                className={`w-16 h-16 ${value.gradient} rounded-2xl flex items-center justify-center`}
              >
                {value.icon}
              </div>
              <h3 className="text-h3 font-semibold text-neutral-textPrimary">
                {value.title}
              </h3>
              <p className="text-body text-neutral-textSecondary">
                {value.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
