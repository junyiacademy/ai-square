'use client';

import { Sparkles, Target, CheckCircle2 } from 'lucide-react';

export function WelcomePanel() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-12 w-12 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-3">歡迎使用場景編輯器</h2>
        <p className="text-gray-600 mb-6">請從左側選擇學習模式開始</p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span>PBL 專案</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            <span>Discovery 探索</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Assessment 評測</span>
          </div>
        </div>
      </div>
    </div>
  );
}
