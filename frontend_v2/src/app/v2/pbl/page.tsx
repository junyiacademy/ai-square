/**
 * V2 PBL Selection Page
 * Browse and start Problem-Based Learning scenarios
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSourceContent } from '@/lib/v2/hooks/useSourceContent';
import { useScenarios } from '@/lib/v2/hooks/useScenarios';
import { ArrowLeft, BookOpen, Clock, Users, Target, Loader2 } from 'lucide-react';

export default function PBLSelectionPage() {
  const router = useRouter();
  const { sourceContent, loading, error } = useSourceContent({ type: 'pbl' });
  const { startScenario } = useScenarios();

  const handleStartScenario = async (source: any) => {
    try {
      const scenario = await startScenario(source);
      router.push(`/v2/scenarios/${scenario.id}`);
    } catch (err) {
      console.error('Failed to start scenario:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading scenarios...</p>
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
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Problem-Based Learning
              </h1>
              <p className="text-gray-600">
                Learn through real-world scenarios and challenges
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Scenarios Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sourceContent.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {source.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {source.description}
                </p>

                {/* Objectives */}
                {source.objectives.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center text-sm text-gray-700 mb-2">
                      <Target className="w-4 h-4 mr-1" />
                      <span className="font-medium">Learning Objectives</span>
                    </div>
                    <ul className="space-y-1">
                      {source.objectives.slice(0, 3).map((objective, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="text-blue-600 mr-1">•</span>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  {source.metadata.duration && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{source.metadata.duration} min</span>
                    </div>
                  )}
                  {source.metadata.difficulty && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full">
                      {source.metadata.difficulty}
                    </span>
                  )}
                  {source.metadata.stages && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{source.metadata.stages.length} stages</span>
                    </div>
                  )}
                </div>

                {/* Prerequisites */}
                {source.prerequisites.length > 0 && (
                  <div className="text-xs text-gray-500 mb-4">
                    Prerequisites: {source.prerequisites.join(', ')}
                  </div>
                )}

                {/* Start button */}
                <button
                  onClick={() => handleStartScenario(source)}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Learning
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {sourceContent.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No scenarios available
            </h3>
            <p className="text-gray-600">
              Check back later for new learning scenarios
            </p>
          </div>
        )}
      </div>
    </div>
  );
}