'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AcademicCapIcon,
  BookOpenIcon,
  CalendarIcon,
  EyeIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { 
  EvaluationCriteria, 
  MentorFeedback, 
  CriteriaScore, 
  ScoreLevel, 
  SCORE_LEVELS 
} from '@/types/evaluation-system';

interface MentorFeedbackFormProps {
  taskId: string;
  workspaceId: string;
  studentId: string;
  studentName: string;
  criteria: EvaluationCriteria[];
  submissionContent: string;
  existingFeedback?: MentorFeedback;
  onSubmit: (feedback: Omit<MentorFeedback, 'id' | 'submittedAt'>) => void;
  onSaveDraft: (feedback: Omit<MentorFeedback, 'id' | 'submittedAt'>) => void;
  onCancel: () => void;
}

export default function MentorFeedbackForm({
  taskId,
  workspaceId,
  studentId,
  studentName,
  criteria,
  submissionContent,
  existingFeedback,
  onSubmit,
  onSaveDraft,
  onCancel
}: MentorFeedbackFormProps) {
  const [scores, setScores] = useState<CriteriaScore[]>(
    existingFeedback?.scores || criteria.map(c => ({ 
      criteriaId: c.id, 
      score: 3 as ScoreLevel,
      comment: '',
      evidence: ''
    }))
  );
  
  const [detailedFeedback, setDetailedFeedback] = useState(
    existingFeedback?.detailedFeedback || ''
  );
  const [strengths, setStrengths] = useState<string[]>(
    existingFeedback?.strengths || ['']
  );
  const [areasForImprovement, setAreasForImprovement] = useState<string[]>(
    existingFeedback?.areasForImprovement || ['']
  );
  const [nextSteps, setNextSteps] = useState<string[]>(
    existingFeedback?.nextSteps || ['']
  );
  const [resourceRecommendations, setResourceRecommendations] = useState<string[]>(
    existingFeedback?.resourceRecommendations || []
  );
  const [followUpDate, setFollowUpDate] = useState(
    existingFeedback?.followUpDate || ''
  );
  const [visibility, setVisibility] = useState<MentorFeedback['visibility']>(
    existingFeedback?.visibility || 'student_only'
  );

  const handleScoreChange = (criteriaId: string, field: keyof CriteriaScore, value: string | number) => {
    setScores(prev => prev.map(score => 
      score.criteriaId === criteriaId 
        ? { ...score, [field]: value }
        : score
    ));
  };

  const handleArrayChange = (
    array: string[], 
    setArray: React.Dispatch<React.SetStateAction<string[]>>, 
    index: number, 
    value: string
  ) => {
    setArray(prev => prev.map((item, i) => i === index ? value : item));
  };

  const addArrayItem = (
    array: string[], 
    setArray: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setArray(prev => [...prev, '']);
  };

  const removeArrayItem = (
    array: string[], 
    setArray: React.Dispatch<React.SetStateAction<string[]>>, 
    index: number
  ) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (status: 'draft' | 'submitted') => {
    const feedback = {
      taskId,
      workspaceId,
      mentorId: 'current-mentor', // TODO: 從認證系統獲取
      studentId,
      scores,
      detailedFeedback,
      strengths: strengths.filter(s => s.trim()),
      areasForImprovement: areasForImprovement.filter(s => s.trim()),
      nextSteps: nextSteps.filter(s => s.trim()),
      resourceRecommendations: resourceRecommendations.filter(s => s.trim()),
      followUpDate: followUpDate || undefined,
      visibility,
      status
    };

    if (status === 'submitted') {
      onSubmit(feedback);
    } else {
      onSaveDraft(feedback);
    }
  };

  const isFormValid = () => {
    return scores.every(score => score.score) && 
           detailedFeedback.trim().length > 0 &&
           strengths.some(s => s.trim()) &&
           areasForImprovement.some(s => s.trim()) &&
           nextSteps.some(s => s.trim());
  };

  const visibilityOptions = [
    { value: 'student_only', label: '僅學生可見', icon: EyeIcon },
    { value: 'peers_and_student', label: '同儕和學生可見', icon: UserGroupIcon },
    { value: 'public', label: '公開可見', icon: GlobeAltIcon }
  ];

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <AcademicCapIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Mentor 回饋</h3>
            <p className="text-sm text-gray-600">
              學生：{studentName}
            </p>
          </div>
        </div>
        
        {/* 可見性設定 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">可見性：</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as MentorFeedback['visibility'])}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {visibilityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 學生作品預覽 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-medium text-gray-900 mb-2">學生作品</h4>
        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
          {submissionContent || '學生尚未提交作品內容'}
        </div>
      </div>

      {/* 評估標準 */}
      <div className="space-y-6 mb-8">
        <h4 className="text-lg font-semibold text-gray-900">專業評估</h4>
        
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
                <p className="text-xs text-purple-600 mt-1">權重：{(criterion.weight * 100).toFixed(0)}%</p>
              </div>
              
              {/* 評分選項 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  專業評分 (1-5分)
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
                          ? `border-purple-500 ${level.color}`
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
              
              {/* 詳細評論 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  專業評析
                </label>
                <textarea
                  value={score?.comment || ''}
                  onChange={(e) => handleScoreChange(criterion.id, 'comment', e.target.value)}
                  placeholder="提供專業的評析和指導..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>
              
              {/* 證據和範例 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  具體證據
                </label>
                <textarea
                  value={score?.evidence || ''}
                  onChange={(e) => handleScoreChange(criterion.id, 'evidence', e.target.value)}
                  placeholder="引用具體的作品內容作為評分依據..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 詳細回饋 */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          整體專業回饋 *
        </label>
        <textarea
          value={detailedFeedback}
          onChange={(e) => setDetailedFeedback(e.target.value)}
          placeholder="提供深入的專業回饋，包括學習成效分析、技能發展建議等..."
          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={5}
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* 優點 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            學習優勢 *
          </label>
          {strengths.map((strength, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={strength}
                onChange={(e) => handleArrayChange(strengths, setStrengths, index, e.target.value)}
                placeholder="描述學生的優勢表現..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {strengths.length > 1 && (
                <button
                  onClick={() => removeArrayItem(strengths, setStrengths, index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addArrayItem(strengths, setStrengths)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            + 新增優勢
          </button>
        </div>

        {/* 改進領域 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            改進領域 *
          </label>
          {areasForImprovement.map((area, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={area}
                onChange={(e) => handleArrayChange(areasForImprovement, setAreasForImprovement, index, e.target.value)}
                placeholder="指出需要改進的領域..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {areasForImprovement.length > 1 && (
                <button
                  onClick={() => removeArrayItem(areasForImprovement, setAreasForImprovement, index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addArrayItem(areasForImprovement, setAreasForImprovement)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            + 新增改進領域
          </button>
        </div>
      </div>

      {/* 後續步驟 */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-3">
          <ArrowRightIcon className="w-5 h-5 text-blue-600" />
          <label className="text-sm font-medium text-gray-700">
            後續學習步驟 *
          </label>
        </div>
        {nextSteps.map((step, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={step}
              onChange={(e) => handleArrayChange(nextSteps, setNextSteps, index, e.target.value)}
              placeholder="建議具體的學習步驟..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {nextSteps.length > 1 && (
              <button
                onClick={() => removeArrayItem(nextSteps, setNextSteps, index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => addArrayItem(nextSteps, setNextSteps)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          + 新增步驟
        </button>
      </div>

      {/* 推薦資源 */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-3">
          <BookOpenIcon className="w-5 h-5 text-green-600" />
          <label className="text-sm font-medium text-gray-700">
            推薦學習資源
          </label>
        </div>
        {resourceRecommendations.map((resource, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={resource}
              onChange={(e) => handleArrayChange(resourceRecommendations, setResourceRecommendations, index, e.target.value)}
              placeholder="推薦相關書籍、課程、網站等..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => removeArrayItem(resourceRecommendations, setResourceRecommendations, index)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => addArrayItem(resourceRecommendations, setResourceRecommendations)}
          className="text-green-600 hover:text-green-700 text-sm font-medium"
        >
          + 新增資源
        </button>
      </div>

      {/* 後續追蹤日期 */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <CalendarIcon className="w-5 h-5 text-orange-600" />
          <label className="text-sm font-medium text-gray-700">
            後續追蹤日期
          </label>
        </div>
        <input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
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
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>提交回饋</span>
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
              {!detailedFeedback.trim() && <li>整體專業回饋</li>}
              {!strengths.some(s => s.trim()) && <li>至少一個學習優勢</li>}
              {!areasForImprovement.some(s => s.trim()) && <li>至少一個改進領域</li>}
              {!nextSteps.some(s => s.trim()) && <li>至少一個後續學習步驟</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}