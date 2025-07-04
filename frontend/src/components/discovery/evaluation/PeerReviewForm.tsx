'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UsersIcon,
  EyeSlashIcon,
  EyeIcon,
  HandThumbUpIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  EvaluationCriteria, 
  PeerReview, 
  CriteriaScore, 
  ScoreLevel, 
  SCORE_LEVELS 
} from '@/types/evaluation-system';

interface PeerReviewFormProps {
  taskId: string;
  workspaceId: string;
  revieweeId: string;
  revieweeName: string;
  criteria: EvaluationCriteria[];
  submissionContent: string; // 被評審者的作品內容
  existingReview?: PeerReview;
  allowAnonymous?: boolean;
  onSubmit: (review: Omit<PeerReview, 'id' | 'submittedAt'>) => void;
  onCancel: () => void;
}

export default function PeerReviewForm({
  taskId,
  workspaceId,
  revieweeId,
  revieweeName,
  criteria,
  submissionContent,
  existingReview,
  allowAnonymous = true,
  onSubmit,
  onCancel
}: PeerReviewFormProps) {
  const [scores, setScores] = useState<CriteriaScore[]>(
    existingReview?.scores || criteria.map(c => ({ 
      criteriaId: c.id, 
      score: 3 as ScoreLevel,
      comment: '',
      evidence: ''
    }))
  );
  
  const [constructiveFeedback, setConstructiveFeedback] = useState(
    existingReview?.constructiveFeedback || ''
  );
  const [strengths, setStrengths] = useState<string[]>(
    existingReview?.strengths || ['']
  );
  const [suggestions, setSuggestions] = useState<string[]>(
    existingReview?.suggestions || ['']
  );
  const [anonymousMode, setAnonymousMode] = useState(
    existingReview?.anonymousMode ?? true
  );

  const handleScoreChange = (criteriaId: string, field: keyof CriteriaScore, value: any) => {
    setScores(prev => prev.map(score => 
      score.criteriaId === criteriaId 
        ? { ...score, [field]: value }
        : score
    ));
  };

  const handleStrengthChange = (index: number, value: string) => {
    setStrengths(prev => prev.map((s, i) => i === index ? value : s));
  };

  const addStrength = () => {
    setStrengths(prev => [...prev, '']);
  };

  const removeStrength = (index: number) => {
    setStrengths(prev => prev.filter((_, i) => i !== index));
  };

  const handleSuggestionChange = (index: number, value: string) => {
    setSuggestions(prev => prev.map((s, i) => i === index ? value : s));
  };

  const addSuggestion = () => {
    setSuggestions(prev => [...prev, '']);
  };

  const removeSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const review = {
      taskId,
      workspaceId,
      reviewerId: 'current-user', // TODO: 從認證系統獲取
      revieweeId,
      scores,
      constructiveFeedback,
      strengths: strengths.filter(s => s.trim()),
      suggestions: suggestions.filter(s => s.trim()),
      anonymousMode,
      status: 'submitted' as const
    };

    onSubmit(review);
  };

  const isFormValid = () => {
    return scores.every(score => score.score) && 
           constructiveFeedback.trim().length > 0 &&
           strengths.some(s => s.trim()) &&
           suggestions.some(s => s.trim());
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">同儕互評</h3>
            <p className="text-sm text-gray-600">
              評審：{anonymousMode ? '匿名評審者' : revieweeName}
            </p>
          </div>
        </div>
        
        {/* 匿名模式切換 */}
        {allowAnonymous && (
          <button
            onClick={() => setAnonymousMode(!anonymousMode)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
              ${anonymousMode 
                ? 'bg-gray-100 text-gray-700' 
                : 'bg-blue-100 text-blue-700'
              }
            `}
          >
            {anonymousMode ? (
              <>
                <EyeSlashIcon className="w-4 h-4" />
                <span>匿名模式</span>
              </>
            ) : (
              <>
                <EyeIcon className="w-4 h-4" />
                <span>公開身份</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 被評審作品預覽 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-medium text-gray-900 mb-2">評審內容</h4>
        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {submissionContent || '尚未提交作品內容'}
        </div>
      </div>

      {/* 評估標準 */}
      <div className="space-y-6 mb-8">
        <h4 className="text-lg font-semibold text-gray-900">評估標準</h4>
        
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
                          ? `border-green-500 ${level.color}`
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  具體回饋
                </label>
                <textarea
                  value={score?.comment || ''}
                  onChange={(e) => handleScoreChange(criterion.id, 'comment', e.target.value)}
                  placeholder="針對這個標準提供具體的回饋..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 建設性回饋 */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          總體回饋 *
        </label>
        <textarea
          value={constructiveFeedback}
          onChange={(e) => setConstructiveFeedback(e.target.value)}
          placeholder="提供整體的建設性回饋，幫助同學改進..."
          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          rows={4}
          required
        />
      </div>

      {/* 優點 */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-3">
          <HandThumbUpIcon className="w-5 h-5 text-green-600" />
          <label className="text-sm font-medium text-gray-700">
            優點和亮點 *
          </label>
        </div>
        
        {strengths.map((strength, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={strength}
              onChange={(e) => handleStrengthChange(index, e.target.value)}
              placeholder="描述一個優點..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {strengths.length > 1 && (
              <button
                onClick={() => removeStrength(index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        <button
          onClick={addStrength}
          className="text-green-600 hover:text-green-700 text-sm font-medium"
        >
          + 新增優點
        </button>
      </div>

      {/* 改進建議 */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-3">
          <LightBulbIcon className="w-5 h-5 text-yellow-600" />
          <label className="text-sm font-medium text-gray-700">
            改進建議 *
          </label>
        </div>
        
        {suggestions.map((suggestion, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={suggestion}
              onChange={(e) => handleSuggestionChange(index, e.target.value)}
              placeholder="提供一個改進建議..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {suggestions.length > 1 && (
              <button
                onClick={() => removeSuggestion(index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        <button
          onClick={addSuggestion}
          className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
        >
          + 新增建議
        </button>
      </div>

      {/* 提交按鈕 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          取消
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={!isFormValid()}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2
            ${isFormValid()
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span>提交評審</span>
        </button>
      </div>
      
      {/* 表單驗證提示 */}
      {!isFormValid() && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">請完成以下必填項目：</p>
            <ul className="mt-1 list-disc list-inside">
              {scores.some(s => !s.score) && <li>所有評估標準的評分</li>}
              {!constructiveFeedback.trim() && <li>總體回饋</li>}
              {!strengths.some(s => s.trim()) && <li>至少一個優點</li>}
              {!suggestions.some(s => s.trim()) && <li>至少一個改進建議</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}