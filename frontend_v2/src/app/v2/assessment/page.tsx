/**
 * V2 Assessment Selection Page
 * Browse and start assessments
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSourceContent } from '@/lib/v2/hooks/useSourceContent';
import { useAssessment } from '@/lib/v2/hooks/useAssessment';
import { ArrowLeft, GraduationCap, Clock, FileQuestion, Award, Loader2 } from 'lucide-react';

export default function AssessmentSelectionPage() {
  const router = useRouter();
  const { sourceContent, loading, error } = useSourceContent({ type: 'assessment' });
  const { startAssessment } = useAssessment();
  const [starting, setStarting] = React.useState<string | null>(null);

  const handleStartAssessment = async (source: any, attemptType: 'practice' | 'formal') => {
    try {
      setStarting(source.id);
      const attempt = await startAssessment(source.code, attemptType);
      router.push(`/v2/scenarios/${attempt.scenario.id}`);
    } catch (err) {
      console.error('Failed to start assessment:', err);
      setStarting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/v2')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <GraduationCap className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Assessments
              </h1>
              <p className="text-gray-600">
                Test your knowledge and earn certifications
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Assessments Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sourceContent.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {source.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {source.description}
                </p>

                {/* Assessment info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <FileQuestion className="w-4 h-4 mr-2" />
                    <span>{source.metadata.questions?.length || 0} questions</span>
                  </div>
                  {source.metadata.timeLimit && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{source.metadata.timeLimit} minutes</span>
                    </div>
                  )}
                  {source.metadata.passingScore && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Award className="w-4 h-4 mr-2" />
                      <span>Passing score: {source.metadata.passingScore}%</span>
                    </div>
                  )}
                </div>

                {/* Objectives */}
                {source.objectives.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      What you'll be tested on:
                    </h4>
                    <ul className="space-y-1">
                      {source.objectives.map((objective, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleStartAssessment(source, 'practice')}
                    disabled={starting === source.id}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {starting === source.id ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Starting...
                      </span>
                    ) : (
                      'Practice Mode'
                    )}
                  </button>
                  <button
                    onClick={() => handleStartAssessment(source, 'formal')}
                    disabled={starting === source.id}
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Formal Assessment
                  </button>
                </div>

                {/* Practice vs Formal info */}
                <div className="mt-3 text-xs text-gray-500">
                  <p className="mb-1">
                    <strong>Practice:</strong> Instant feedback, no time limit
                  </p>
                  <p>
                    <strong>Formal:</strong> Timed, final score only
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {sourceContent.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assessments available
            </h3>
            <p className="text-gray-600">
              Check back later for new assessments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}