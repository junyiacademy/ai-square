"use client";

import React from "react";

/**
 * News Section
 * 3-column cards showcasing latest updates and achievements
 */
export default function NewsSection() {
  const news = [
    {
      date: "2024-12",
      category: "產品更新",
      title: "AI 評量系統 2.0 正式上線",
      description: "新增多模態評量，支援圖片、影片等多媒體內容分析",
      tag: "新功能",
      tagColor: "bg-primary-blue",
    },
    {
      date: "2024-11",
      category: "合作夥伴",
      title: "攜手 100+ 學校推動智慧教育",
      description: "全台超過 100 所學校導入 AI Square，惠及 5 萬名學生",
      tag: "里程碑",
      tagColor: "bg-secondary-orange",
    },
    {
      date: "2024-10",
      category: "獎項榮譽",
      title: "榮獲教育科技創新獎",
      description: "AI Square 獲教育部頒發年度教育科技創新應用獎",
      tag: "獲獎",
      tagColor: "bg-gradient-blue-orange",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-h1 text-gray-900 mb-4">最新消息</h2>
            <p className="text-h4 text-gray-600 max-w-2xl mx-auto">
              持續創新，為教育帶來更多可能
            </p>
          </div>

          {/* News cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {news.map((item, index) => (
              <article
                key={index}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Tag and date */}
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`${item.tagColor} text-white px-3 py-1 rounded-full text-sm font-semibold`}
                    >
                      {item.tag}
                    </span>
                    <time className="text-sm text-gray-500">{item.date}</time>
                  </div>

                  {/* Category */}
                  <p className="text-sm text-gray-600 mb-3">{item.category}</p>

                  {/* Title */}
                  <h3 className="text-h4 text-gray-900 font-semibold mb-4 group-hover:text-primary-blue transition-colors duration-300">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-h6 text-gray-600 leading-relaxed mb-6">
                    {item.description}
                  </p>

                  {/* Read more link */}
                  <div className="flex items-center text-primary-blue font-semibold group-hover:gap-2 transition-all duration-300">
                    <span>閱讀更多</span>
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* View all news link */}
          <div className="mt-12 text-center">
            <button className="px-8 py-4 bg-white text-primary-blue border-2 border-primary-blue rounded-full font-semibold hover:bg-primary-blue hover:text-white transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-primary-blue focus:ring-opacity-50">
              查看所有消息
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
