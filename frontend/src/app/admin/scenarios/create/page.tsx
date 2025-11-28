'use client';

/**
 * Prompt-to-Course Admin Page
 * Phase 1: Preview Only (no GitHub push)
 *
 * Features:
 * - AI-powered scenario generation
 * - Visual/Markdown/Code preview
 * - Real-time YAML validation
 * - Download functionality
 */

import { useState } from 'react';
import { InputForm } from './components/InputForm';
import { PreviewTabs } from './components/PreviewTabs';
import { ValidationPanel } from './components/ValidationPanel';
import type { CourseGenerationInput, GenerateScenarioResponse } from '@/types/prompt-to-course';

export default function PromptToCoursePage() {
  const [yaml, setYaml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationInfo, setGenerationInfo] = useState<{
    processingTime: number;
    tokensUsed?: number;
  } | null>(null);
  const [mode, setMode] = useState<'pbl' | 'discovery' | 'assessment'>('pbl');

  const handleGenerate = async (input: CourseGenerationInput) => {
    setIsGenerating(true);
    setError(null);
    setMode(input.mode);

    try {
      const response = await fetch('/api/scenarios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: string };
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json() as GenerateScenarioResponse;

      setYaml(result.yaml);
      setGenerationInfo({
        processingTime: result.processingTime,
        tokensUsed: result.tokensUsed,
      });

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Generation warnings:', result.warnings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate scenario';
      setError(errorMessage);
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!yaml) return;

    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-${Date.now()}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setYaml('');
    setError(null);
    setGenerationInfo(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Prompt-to-Course Generator
          </h1>
          <p className="text-gray-600">
            Generate AI-powered learning scenarios from natural language descriptions
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
              Phase 1: Preview Only
            </span>
            <span>GitHub push will be available in Phase 2</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <div>
                <div className="font-medium text-red-900">Generation Error</div>
                <div className="text-sm text-red-700 mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Generation Info */}
        {generationInfo && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-900">
              <span className="text-xl">✅</span>
              <div className="text-sm">
                <span className="font-medium">Generated successfully!</span>
                <span className="ml-2 text-green-700">
                  Took {(generationInfo.processingTime / 1000).toFixed(2)}s
                </span>
                {generationInfo.tokensUsed && (
                  <span className="ml-2 text-green-700">
                    • {generationInfo.tokensUsed} tokens
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-1">
            <InputForm onSubmit={handleGenerate} isGenerating={isGenerating} />
          </div>

          {/* Right Column: Preview & Validation */}
          <div className="lg:col-span-2 space-y-6">
            {!yaml ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-24 w-24"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Scenario Generated Yet
                </h3>
                <p className="text-gray-500">
                  Fill in the form and click "Generate Scenario" to get started
                </p>
              </div>
            ) : (
              <>
                {/* Preview Tabs */}
                <PreviewTabs yaml={yaml} onYamlChange={setYaml} />

                {/* Validation Panel */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Validation
                  </h3>
                  <ValidationPanel yaml={yaml} mode={mode} />
                </div>

                {/* Action Buttons */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex gap-4">
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                    >
                      📥 Download YAML
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                    >
                      🔄 Start Over
                    </button>
                    <button
                      disabled
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed"
                      title="GitHub push will be available in Phase 2"
                    >
                      🚫 Push to GitHub (Phase 2)
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-gray-500 text-center">
                    Phase 1: Preview and download only. GitHub integration coming in Phase 2.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
