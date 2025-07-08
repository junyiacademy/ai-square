/**
 * V2 Discovery Selection Page
 * Browse careers for exploration
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSourceContent } from '@/lib/v2/hooks/useSourceContent';
import { useScenarios } from '@/lib/v2/hooks/useScenarios';
import { ArrowLeft, Compass, Briefcase, TrendingUp, Star, Loader2 } from 'lucide-react';

export default function DiscoverySelectionPage() {
  const router = useRouter();
  const { sourceContent, loading, error } = useSourceContent({ type: 'discovery' });
  const { startScenario } = useScenarios();

  const handleStartDiscovery = async (source: any) => {
    try {
      const scenario = await startScenario(source);
      router.push(`/v2/scenarios/${scenario.id}`);
    } catch (err) {
      console.error('Failed to start discovery:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading careers...</p>
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
            <div className="p-3 bg-purple-100 rounded-lg">
              <Compass className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Career Discovery
              </h1>
              <p className="text-gray-600">
                Explore different career paths through interactive experiences
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Careers Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sourceContent.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Career image placeholder */}
              <div className="h-48 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Briefcase className="w-16 h-16 text-white opacity-50" />
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {source.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {source.description}
                </p>

                {/* Career info */}
                <div className="space-y-3 mb-4">
                  {source.metadata.salary_range && (
                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                      <span>Salary: {source.metadata.salary_range}</span>
                    </div>
                  )}
                  {source.metadata.growth_rate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="w-4 h-4 mr-2 text-yellow-600" />
                      <span>Growth: {source.metadata.growth_rate}</span>
                    </div>
                  )}
                  {source.metadata.skills && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Key Skills:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {source.metadata.skills.slice(0, 3).map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {source.metadata.skills.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{source.metadata.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* What you'll explore */}
                {source.objectives.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      What you'll explore:
                    </h4>
                    <ul className="space-y-1">
                      {source.objectives.slice(0, 3).map((objective, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="text-purple-600 mr-1">•</span>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Start button */}
                <button
                  onClick={() => handleStartDiscovery(source)}
                  className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Start Exploring
                </button>

                {/* XP info */}
                {source.metadata.total_xp && (
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Earn up to {source.metadata.total_xp} XP
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {sourceContent.length === 0 && (
          <div className="text-center py-12">
            <Compass className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No careers available
            </h3>
            <p className="text-gray-600">
              Check back later for new career paths to explore
            </p>
          </div>
        )}
      </div>
    </div>
  );
}