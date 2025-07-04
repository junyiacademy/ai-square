'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { 
  EvaluationCriteria, 
  SelfAssessment, 
  CriteriaScore, 
  ScoreLevel, 
  SCORE_LEVELS 
} from '@/types/evaluation-system';

interface SelfAssessmentFormProps {
  taskId: string;
  workspaceId: string;
  criteria: EvaluationCriteria[];
  existingAssessment?: SelfAssessment;
  onSubmit: (assessment: Omit<SelfAssessment, 'id' | 'submittedAt'>) => void;
  onSaveDraft: (assessment: Omit<SelfAssessment, 'id' | 'submittedAt'>) => void;
  onCancel: () => void;
}

export default function SelfAssessmentForm({
  taskId,
  workspaceId,
  criteria,
  existingAssessment,
  onSubmit,
  onSaveDraft,
  onCancel
}: SelfAssessmentFormProps) {
  const [scores, setScores] = useState<CriteriaScore[]>(
    existingAssessment?.scores || criteria.map(c => ({ 
      criteriaId: c.id, 
      score: 3 as ScoreLevel,
      comment: '',
      evidence: ''
    }))
  );
  
  const [overallReflection, setOverallReflection] = useState(
    existingAssessment?.overallReflection || ''
  );
  const [learningGoals, setLearningGoals] = useState(
    existingAssessment?.learningGoals || ''
  );
  const [challenges, setChallenges] = useState(
    existingAssessment?.challenges || ''
  );
  const [improvements, setImprovements] = useState(
    existingAssessment?.improvements || ''
  );

  const handleScoreChange = (criteriaId: string, field: keyof CriteriaScore, value: any) => {
    setScores(prev => prev.map(score => 
      score.criteriaId === criteriaId 
        ? { ...score, [field]: value }
        : score
    ));
  };

  const handleSubmit = (status: 'draft' | 'submitted') => {
    const assessment = {
      taskId,
      workspaceId,
      userId: 'current-user', // TODO: 從認證系統獲取
      scores,
      overallReflection,
      learningGoals,
      challenges,
      improvements,
      status
    };

    if (status === 'submitted') {
      onSubmit(assessment);
    } else {
      onSaveDraft(assessment);
    }
  };

  const isFormValid = () => {
    return scores.every(score => score.score) && 
           overallReflection.trim().length > 0;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">自我評估</h3>
          <p className="text-sm text-gray-600">反思你的學習過程和成果</p>
        </div>
      </div>

      {/* 評估標準 */}
      <div className="space-y-6 mb-8">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <ClipboardDocumentListIcon className="w-5 h-5 text-purple-600" />
          <span>評估標準</span>
        </h4>
        
        {criteria.map((criterion, index) => {
          const score = scores.find(s => s.criteriaId === criterion.id);
          
          return (
            <motion.div
              key={criterion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="border border-gray-200 rounded-xl p-6"
            >
              <div className="mb-4">
                <h5 className="font-semibold text-gray-900 mb-2">{criterion.name}</h5>
                <p className="text-sm text-gray-600">{criterion.description}</p>
              </div>
              
              {/* 評分選項 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  評分 (1-5分)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {SCORE_LEVELS.map(level => (
                    <button
                      key={level.level}
                      type="button"
                      onClick={() => handleScoreChange(criterion.id, 'score', level.level)}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${score?.score === level.level
                          ? `border-blue-500 ${level.color}`
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="font-bold">{level.level}</div>
                      <div className="text-xs">{level.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 評論 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  具體說明
                </label>
                <textarea
                  value={score?.comment || ''}
                  onChange={(e) => handleScoreChange(criterion.id, 'comment', e.target.value)}
                  placeholder="說明你為什麼給這個分數..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              
              {/* 證據 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  證據或範例
                </label>
                <textarea
                  value={score?.evidence || ''}
                  onChange={(e) => handleScoreChange(criterion.id, 'evidence', e.target.value)}
                  placeholder="提供支持你評分的具體證據或範例..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 反思問題 */}
      <div className="space-y-6 mb-8">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <LightBulbIcon className="w-5 h-5 text-yellow-600" />
          <span>學習反思</span>
        </h4>
        
        {/* 整體反思 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            整體學習心得 *
          </label>
          <textarea
            value={overallReflection}
            onChange={(e) => setOverallReflection(e.target.value)}
            placeholder="描述你在這個任務中的學習經驗、感受和收穫..."
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            required
          />
        </div>
        
        {/* 學習目標 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            後續學習目標
          </label>
          <textarea
            value={learningGoals}
            onChange={(e) => setLearningGoals(e.target.value)}
            placeholder="基於這次經驗，你希望在哪些方面繼續學習和改進？"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
        
        {/* 遇到的挑戰 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            遇到的挑戰
          </label>
          <textarea
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            placeholder="在完成任務過程中遇到了哪些困難或挑戰？"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
        
        {/* 改進計畫 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            改進計畫
          </label>
          <textarea
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            placeholder="你計畫如何改進和提升自己的表現？"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
      </div>

      {/* 提交按鈕 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          取消
        </button>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleSubmit('draft')}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            儲存草稿
          </button>
          
          <button
            onClick={() => handleSubmit('submitted')}
            disabled={!isFormValid()}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2
              ${isFormValid()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>提交自評</span>
          </button>
        </div>
      </div>
      
      {/* 表單驗證提示 */}
      {!isFormValid() && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">請完成以下必填項目：</p>
            <ul className="mt-1 list-disc list-inside">
              {scores.some(s => !s.score) && <li>所有評估標準的評分</li>}
              {!overallReflection.trim() && <li>整體學習心得</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}