'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Search, ClipboardCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function V2HomePage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Square V2
          </h1>
          <p className="text-xl text-gray-600">
            {t('v2.subtitle', 'Next Generation AI Learning Experience')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {/* PBL Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                <BookOpen className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-semibold">Problem-Based Learning</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Learn through real-world AI scenarios with guided AI tutoring
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Interactive scenarios</li>
              <li>• AI-powered guidance</li>
              <li>• Real-time feedback</li>
            </ul>
          </div>

          {/* Discovery Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                <Search className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-semibold">Discovery Mode</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Explore AI concepts through open-ended experimentation
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Free exploration</li>
              <li>• AI companionship</li>
              <li>• Learning insights</li>
            </ul>
          </div>

          {/* Assessment Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                <ClipboardCheck className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-semibold">Smart Assessment</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Test your AI literacy with adaptive assessments
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Adaptive questions</li>
              <li>• Instant feedback</li>
              <li>• Progress tracking</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/v2/scenarios')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg"
          >
            {t('v2.startLearning', 'Start Learning')}
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="mt-16 text-center text-gray-500">
          <p className="text-sm">
            {t('v2.features', 'Features')}: Multi-language support • Real-time AI feedback • Progress tracking • Unified learning experience
          </p>
        </div>
      </div>
    </div>
  );
}