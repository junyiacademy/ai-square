/**
 * V2 Evaluation Display Component
 * Shows evaluation results and feedback
 */

import React from 'react';
import { Evaluation } from '@/lib/v2/interfaces/base';
import { CheckCircle, XCircle, TrendingUp, Lightbulb, Target } from 'lucide-react';
import clsx from 'clsx';

interface EvaluationDisplayProps {
  evaluation: Evaluation;
  showDetails?: boolean;
}

export function EvaluationDisplay({
  evaluation,
  showDetails = true
}: EvaluationDisplayProps) {
  const overallScore = evaluation.scores.overall || evaluation.scores.percentage || 0;
  const isQuiz = evaluation.evaluation_type === 'quiz';
  
  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className={clsx(
        'rounded-lg p-6 border-2 text-center',
        getScoreColor(overallScore)
      )}>
        {isQuiz ? (
          <div>
            {evaluation.result?.is_correct ? (
              <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            ) : (
              <XCircle className="w-12 h-12 mx-auto mb-2" />
            )}
            <h3 className="text-2xl font-bold">
              {evaluation.result?.is_correct ? 'Correct!' : 'Incorrect'}
            </h3>
            {evaluation.scores.points !== undefined && (
              <p className="mt-1">
                {evaluation.scores.points} / {evaluation.scores.max_points || 1} points
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="text-4xl font-bold">{Math.round(overallScore)}%</div>
            <p className="mt-1 text-lg">Overall Score</p>
          </div>
        )}
      </div>

      {/* Feedback */}
      {evaluation.feedback && showDetails && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Summary */}
          {evaluation.feedback.summary && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-1">Summary</h4>
              <p className="text-gray-700">{evaluation.feedback.summary}</p>
            </div>
          )}

          {/* Strengths */}
          {evaluation.feedback.strengths && evaluation.feedback.strengths.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 text-green-700 mb-2">
                <TrendingUp className="w-4 h-4" />
                <h4 className="font-medium">Strengths</h4>
              </div>
              <ul className="space-y-1">
                {evaluation.feedback.strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-gray-700 text-sm flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {evaluation.feedback.improvements && evaluation.feedback.improvements.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 text-amber-700 mb-2">
                <Lightbulb className="w-4 h-4" />
                <h4 className="font-medium">Areas for Improvement</h4>
              </div>
              <ul className="space-y-1">
                {evaluation.feedback.improvements.map((improvement: string, index: number) => (
                  <li key={index} className="text-gray-700 text-sm flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Detailed Scores */}
      {!isQuiz && Object.keys(evaluation.scores).length > 1 && showDetails && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Detailed Scores</h4>
          <div className="space-y-2">
            {Object.entries(evaluation.scores)
              .filter(([key]) => key !== 'overall' && key !== 'percentage')
              .map(([criterion, score]) => (
                <div key={criterion} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">
                    {criterion.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className={clsx(
                          'h-2 rounded-full transition-all',
                          {
                            'bg-green-500': score >= 80,
                            'bg-yellow-500': score >= 60 && score < 80,
                            'bg-red-500': score < 60
                          }
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {Math.round(score)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* KSA Achievement */}
      {evaluation.ksa_mapping && Object.keys(evaluation.ksa_mapping).length > 0 && showDetails && (
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="flex items-center space-x-2 text-purple-900 mb-3">
            <Target className="w-4 h-4" />
            <h4 className="font-medium">Skills Achievement</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(evaluation.ksa_mapping).map(([ksa, achievement]) => (
              <div key={ksa} className="flex items-center justify-between text-sm">
                <span className="text-purple-700">{ksa}</span>
                <span className="font-medium text-purple-900">
                  {Math.round(achievement as number)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP Earned (for Discovery) */}
      {evaluation.result?.xp_earned && (
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 text-center">
          <p className="text-purple-900 font-medium">
            +{evaluation.result.xp_earned} XP Earned!
          </p>
        </div>
      )}
    </div>
  );
}