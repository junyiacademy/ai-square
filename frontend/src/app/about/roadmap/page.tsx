"use client";

import { useState } from "react";
import Link from "next/link";

// 狀態類型定義
type Status = "completed" | "active" | "partial" | "planned" | "future";

// 型別定義
interface Feature {
  name: string;
  status: Status;
}

interface Phase {
  id: string;
  name: string;
  status: Status;
  timeline: string;
  progress: number;
  features: Feature[];
}

interface RoadmapData {
  vision: {
    title: string;
    content: string;
  };
  architecture: {
    layers: Array<{
      name: string;
      status: Status;
      description: string;
    }>;
  };
  phases: Phase[];
  marketInsights: {
    painPoints: Array<{ icon: string; title: string; description: string }>;
    solutions: Array<{ icon: string; title: string; description: string }>;
  };
  techStack: {
    frontend: string[];
    backend: string[];
    storage: string[];
    deployment: string[];
  };
}

// PRD 內容結構
const roadmapData: RoadmapData = {
  vision: {
    title: "產品願景",
    content:
      "AI Square 是一個「用 AI 學 AI 素養」的創新學習平台，基於國際 AI Literacy 框架，透過 AI 技術本身來提升學習者的 AI 素養能力。",
  },

  architecture: {
    layers: [
      {
        name: "MCP/Agent Layer",
        status: "planned" as Status,
        description: "統一的 AI Agent 管理與協調",
      },
      {
        name: "SaaS App Layer",
        status: "active" as Status,
        description: "學習平台 UI + 用戶認證 + 評估介面",
      },
      {
        name: "CMS Service Layer",
        status: "completed" as Status,
        description: "內容 API + YAML 解析 + 版本控制 + AI 輔助",
      },
      {
        name: "Content File Layer",
        status: "completed" as Status,
        description: "GitHub 管理的教材與題庫",
      },
    ],
  },

  phases: [
    {
      id: "phase0",
      name: "Phase 0: Bootstrapping",
      status: "completed" as Status,
      timeline: "2025/06/15 - 2025/06/26",
      progress: 100,
      features: [
        { name: "Git-Based 內容管理", status: "completed" as Status },
        { name: "基礎認證系統", status: "completed" as Status },
        { name: "GitHub Pages 啟用", status: "completed" as Status },
      ],
    },
    {
      id: "phase1",
      name: "Phase 1: MVP Baseline",
      status: "completed" as Status,
      timeline: "2025/06/27 - 2025/07/02",
      progress: 100,
      features: [
        { name: "渲染講義與題目", status: "completed" as Status },
        { name: "PBL 情境學習", status: "completed" as Status },
        { name: "多語言支援 (9種)", status: "completed" as Status },
        { name: "測試覆蓋率 80%+", status: "completed" as Status },
        { name: "TypeScript 型別安全", status: "completed" as Status },
        { name: "CMS 系統增強", status: "completed" as Status },
        { name: "自動化內容發布", status: "completed" as Status },
      ],
    },
    {
      id: "phase1_5",
      name: "Phase 1.5: CMS 進階功能",
      status: "completed" as Status,
      timeline: "2025/06/30 - 2025/07/02",
      progress: 100,
      features: [
        { name: "分支管理系統", status: "completed" as Status },
        { name: "現代化 UI/UX", status: "completed" as Status },
        { name: "AI Quick Actions", status: "completed" as Status },
        { name: "YAML 驗證與排序", status: "completed" as Status },
        { name: "PR 工作流程自動化", status: "completed" as Status },
        { name: "完整測試覆蓋", status: "completed" as Status },
      ],
    },
    {
      id: "phase2",
      name: "Phase 2: 智能化升級",
      status: "planned" as Status,
      timeline: "2025/07 - 2025/09",
      progress: 0,
      features: [
        { name: "OAuth2 社交登入", status: "planned" as Status },
        { name: "AI 資源使用追蹤", status: "planned" as Status },
        { name: "PBL 修改歷程記錄", status: "planned" as Status },
        { name: "智能 Onboarding", status: "planned" as Status },
        { name: "動態難度調整", status: "planned" as Status },
        { name: "社交學習功能", status: "planned" as Status },
        { name: "LLM Service 抽象層", status: "planned" as Status },
      ],
    },
    {
      id: "phase3",
      name: "Phase 3: Agent 系統",
      status: "future" as Status,
      timeline: "2025/10 - 2025/12",
      progress: 0,
      features: [
        { name: "學習路徑規劃 Agent", status: "future" as Status },
        { name: "個人化教學 Agent", status: "future" as Status },
        { name: "協作學習 Agent", status: "future" as Status },
      ],
    },
  ],

  marketInsights: {
    painPoints: [
      {
        icon: "😔",
        title: "孤獨感",
        description: "線上學習最大問題是孤獨和缺乏動力",
      },
      {
        icon: "🤔",
        title: "不會用 AI",
        description: "知道 ChatGPT 但不知道怎麼用得好",
      },
      {
        icon: "🏢",
        title: "企業需求",
        description: "急需結構化的 AI 素養培訓方案",
      },
    ],
    solutions: [
      { icon: "🤝", title: "智能櫃檯", description: "隨時接待的個人化引導" },
      {
        icon: "🥋",
        title: "PBL 道場",
        description: "固定目標但彈性的學習體驗",
      },
      {
        icon: "👥",
        title: "學習社群",
        description: "共學、競爭、分享的社交體驗",
      },
    ],
  },

  techStack: {
    frontend: [
      "Next.js 15",
      "TypeScript",
      "Tailwind CSS",
      "Monaco Editor",
      "react-i18next",
    ],
    backend: ["FastAPI", "Vertex AI", "GitHub API", "YAML Processing"],
    storage: ["GCS", "GitHub Repository", "Local Cache"],
    deployment: ["Google Cloud Run", "Docker", "GitHub Actions", "Vercel"],
  },
};

// 狀態顏色對應
const statusColors: Record<Status, string> = {
  completed: "bg-green-500",
  active: "bg-blue-500",
  partial: "bg-yellow-500",
  planned: "bg-gray-400",
  future: "bg-gray-300",
};

const statusLabels: Record<Status, string> = {
  completed: "已完成",
  active: "進行中",
  partial: "部分完成",
  planned: "計劃中",
  future: "未來規劃",
};

export default function RoadmapPage() {
  const [activePhase, setActivePhase] = useState("phase1");
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  AI Square 產品路線圖
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  產品願景、開發進度與技術架構
                </p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                返回首頁
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: "overview", name: "總覽" },
              { id: "architecture", name: "系統架構" },
              { id: "roadmap", name: "開發進度" },
              { id: "market", name: "市場洞察" },
              { id: "tech", name: "技術棧" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Vision */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4">
                🎯 {roadmapData.vision.title}
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                {roadmapData.vision.content}
              </p>
            </div>

            {/* Core Values */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">💡 核心價值</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roadmapData.marketInsights.solutions.map((solution, index) => (
                  <div key={index} className="text-center">
                    <div className="text-4xl mb-3">{solution.icon}</div>
                    <h3 className="font-semibold text-lg mb-2">
                      {solution.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {solution.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                  9
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-300">
                  支援語言
                </div>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                  5+
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  PBL 情境
                </div>
              </div>
              <div className="bg-green-100 dark:bg-green-900 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                  100%
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  Phase 1 完成
                </div>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                  Q3
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                  Agent 系統
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === "architecture" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">🏗️ 系統架構</h2>
            <div className="space-y-4">
              {roadmapData.architecture.layers.map((layer, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{layer.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {layer.description}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${statusColors[layer.status]}`}
                      >
                        {statusLabels[layer.status]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roadmap Tab */}
        {activeTab === "roadmap" && (
          <div className="space-y-6">
            {roadmapData.phases.map((phase) => (
              <div
                key={phase.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer transition-all ${
                  activePhase === phase.id ? "ring-2 ring-purple-500" : ""
                }`}
                onClick={() => setActivePhase(phase.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{phase.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {phase.timeline}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${statusColors[phase.status]}`}
                  >
                    {statusLabels[phase.status]}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${phase.progress}%` }}
                  />
                </div>

                {/* Features */}
                {activePhase === phase.id && (
                  <div className="mt-4 space-y-2">
                    {phase.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {feature.name}
                        </span>
                        <span
                          className={`text-sm px-2 py-1 rounded ${
                            feature.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : feature.status === "partial"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusLabels[feature.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Market Insights Tab */}
        {activeTab === "market" && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">🎯 市場痛點</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roadmapData.marketInsights.painPoints.map((point, index) => (
                  <div
                    key={index}
                    className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6"
                  >
                    <div className="text-3xl mb-3">{point.icon}</div>
                    <h3 className="font-semibold text-lg mb-2">
                      {point.title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {point.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">💡 解決方案</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roadmapData.marketInsights.solutions.map((solution, index) => (
                  <div
                    key={index}
                    className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6"
                  >
                    <div className="text-3xl mb-3">{solution.icon}</div>
                    <h3 className="font-semibold text-lg mb-2">
                      {solution.title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {solution.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tech Stack Tab */}
        {activeTab === "tech" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">🛠️ 技術棧</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(roadmapData.techStack).map(
                ([category, techs]) => (
                  <div
                    key={category}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6"
                  >
                    <h3 className="font-semibold text-lg mb-3 capitalize">
                      {category}
                    </h3>
                    <ul className="space-y-2">
                      {techs.map((tech, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {tech}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
