'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';

interface QuestionBank {
  total?: number;
  byDomain?: Record<string, number>;
  [key: string]: unknown;
}

interface ScoringRubric {
  passingScore?: number;
  excellentScore?: number;
  [key: string]: unknown;
}

interface TimeLimits {
  perQuestion?: number;
  total?: number;
  [key: string]: unknown;
}

interface AssessmentData {
  assessmentType?: 'diagnostic' | 'formative' | 'summative';
  questionBank?: QuestionBank;
  scoringRubric?: ScoringRubric;
  timeLimits?: TimeLimits;
  [key: string]: unknown;
}

interface AssessmentModeSettingsProps {
  assessmentData?: AssessmentData;
  isExpanded: boolean;
  onToggle: () => void;
}

export function AssessmentModeSettings({
  assessmentData,
  isExpanded,
  onToggle
}: AssessmentModeSettingsProps) {
  const getAssessmentTypeLabel = (type?: string) => {
    switch (type) {
      case 'diagnostic': return '診斷性評測';
      case 'formative': return '形成性評測';
      case 'summative': return '總結性評測';
      default: return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="font-bold text-gray-800">📊 Assessment 專屬設定</span>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4 mt-3">
          {/* Assessment Type */}
          {assessmentData?.assessmentType && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Assessment Type - 評測類型</label>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {getAssessmentTypeLabel(assessmentData.assessmentType)}
              </span>
            </div>
          )}

          {/* Question Bank */}
          {assessmentData?.questionBank && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Question Bank - 題庫</label>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {assessmentData.questionBank.total !== undefined && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">總題數: </span>
                    <span className="text-sm font-bold text-gray-800">{assessmentData.questionBank.total}</span>
                  </div>
                )}
                {assessmentData.questionBank.byDomain && Object.keys(assessmentData.questionBank.byDomain).length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-600 block mb-1">各領域題數:</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(assessmentData.questionBank.byDomain).map(([domain, count]) => (
                        <div key={domain} className="bg-white rounded p-2 flex justify-between items-center">
                          <span className="text-xs text-gray-700">{domain}</span>
                          <span className="text-sm font-bold text-blue-600">{String(count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scoring Rubric */}
          {assessmentData?.scoringRubric && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Scoring Rubric - 評分標準</label>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 grid grid-cols-2 gap-3">
                {assessmentData.scoringRubric.passingScore !== undefined && (
                  <div>
                    <div className="text-xs text-gray-600">及格分數</div>
                    <div className="text-lg font-bold text-green-600">{assessmentData.scoringRubric.passingScore}%</div>
                  </div>
                )}
                {assessmentData.scoringRubric.excellentScore !== undefined && (
                  <div>
                    <div className="text-xs text-gray-600">優秀分數</div>
                    <div className="text-lg font-bold text-blue-600">{assessmentData.scoringRubric.excellentScore}%</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Time Limits */}
          {assessmentData?.timeLimits && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Time Limits - 時間限制</label>
              <div className="bg-yellow-50 rounded-lg p-3 space-y-2">
                {assessmentData.timeLimits.perQuestion !== undefined && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">每題時間: </span>
                    <span className="text-sm text-gray-800">{assessmentData.timeLimits.perQuestion} 分鐘</span>
                  </div>
                )}
                {assessmentData.timeLimits.total !== undefined && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">總時間: </span>
                    <span className="text-sm font-bold text-gray-800">{assessmentData.timeLimits.total} 分鐘</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
