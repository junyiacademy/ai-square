/**
 * V2 Dashboard Page
 * Main entry point for V2 learning system
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useScenarios } from '@/lib/v2/hooks/useScenarios';
import { ScenarioCard } from '@/lib/v2/components/ScenarioCard';
import { Plus, BookOpen, Compass, GraduationCap, Loader2 } from 'lucide-react';

export default function V2DashboardPage() {
  const router = useRouter();
  const { scenarios, loading, error } = useScenarios({ autoRefresh: true });

  // Group scenarios by type
  const scenariosByType = scenarios.reduce((acc, scenario) => {
    if (!acc[scenario.type]) {
      acc[scenario.type] = [];
    }
    acc[scenario.type].push(scenario);
    return acc;
  }, {} as Record<string, typeof scenarios>);

  if (loading && scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Learning Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Continue your learning journey or start something new
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Active Scenarios */}
        {scenarios.filter(s => s.status === 'active').length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Continue Learning
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scenarios
                .filter(s => s.status === 'active')
                .map(scenario => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    onClick={() => router.push(`/v2/scenarios/${scenario.id}`)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Start New */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Start Something New
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {/* PBL Card */}
            <button
              onClick={() => router.push('/v2/pbl')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Problem-Based Learning
                </h3>
              </div>
              <p className="text-gray-600">
                Learn through real-world scenarios and challenges
              </p>
              <div className="mt-4 flex items-center text-blue-600">
                <span className="text-sm font-medium">Browse scenarios</span>
                <Plus className="w-4 h-4 ml-1" />
              </div>
            </button>

            {/* Discovery Card */}
            <button
              onClick={() => router.push('/v2/discovery')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Compass className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Career Discovery
                </h3>
              </div>
              <p className="text-gray-600">
                Explore different career paths and opportunities
              </p>
              <div className="mt-4 flex items-center text-purple-600">
                <span className="text-sm font-medium">Explore careers</span>
                <Plus className="w-4 h-4 ml-1" />
              </div>
            </button>

            {/* Assessment Card */}
            <button
              onClick={() => router.push('/v2/assessment')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Assessments
                </h3>
              </div>
              <p className="text-gray-600">
                Test your knowledge and track progress
              </p>
              <div className="mt-4 flex items-center text-green-600">
                <span className="text-sm font-medium">Take assessment</span>
                <Plus className="w-4 h-4 ml-1" />
              </div>
            </button>
          </div>
        </div>

        {/* Completed Scenarios */}
        {scenarios.filter(s => s.status === 'completed').length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Completed
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scenarios
                .filter(s => s.status === 'completed')
                .slice(0, 6)
                .map(scenario => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    onClick={() => router.push(`/v2/scenarios/${scenario.id}`)}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}