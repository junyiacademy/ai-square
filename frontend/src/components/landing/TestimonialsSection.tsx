"use client";

import React from "react";
import GlassCard from "@/components/ui/GlassCard";

/**
 * Testimonials Section
 * Glassmorphism cards with user testimonials
 */
export default function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "這個平台徹底改變了我的學習方式，AI 回饋讓我知道哪裡需要加強。",
      author: "陳同學",
      role: "國中三年級",
      rating: 5,
    },
    {
      quote: "批改作業的時間減少了一半，我能把更多時間放在教學設計上。",
      author: "李老師",
      role: "國文教師",
      rating: 5,
    },
    {
      quote: "數據分析功能讓我們能更精準地了解每個學生的學習狀況。",
      author: "張主任",
      role: "教務主任",
      rating: 5,
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-h1 text-gray-900 mb-4">用戶怎麼說</h2>
            <p className="text-h4 text-gray-600 max-w-2xl mx-auto">
              真實的使用體驗與評價
            </p>
          </div>

          {/* Testimonials grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <GlassCard
                key={index}
                variant={index === 0 ? "blue" : index === 2 ? "orange" : "default"}
                className="h-full"
              >
                {/* Rating stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-secondary-orange"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="mb-6">
                  <p className="text-h5 text-gray-700 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </blockquote>

                {/* Author */}
                <div className="mt-auto pt-6 border-t border-gray-200">
                  <div className="font-semibold text-h5 text-gray-900">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
