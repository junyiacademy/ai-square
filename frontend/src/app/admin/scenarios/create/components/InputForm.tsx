'use client';

/**
 * InputForm Component
 * Form for course content input with validation
 */

import { useState } from 'react';
import type { CourseGenerationInput } from '@/types/prompt-to-course';

interface InputFormProps {
  onSubmit: (input: CourseGenerationInput) => void;
  isGenerating: boolean;
}

export function InputForm({ onSubmit, isGenerating }: InputFormProps) {
  const [formData, setFormData] = useState<Partial<CourseGenerationInput>>({
    mode: 'pbl',
    difficulty: 'beginner',
    estimatedMinutes: 60,
    taskCount: 5,
    targetDomains: ['ai_literacy'],
    language: 'en',
    prerequisites: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scenarioId || formData.scenarioId.trim() === '') {
      newErrors.scenarioId = 'Scenario ID is required';
    } else if (!/^[a-z0-9_-]+$/.test(formData.scenarioId)) {
      newErrors.scenarioId = 'Scenario ID must contain only lowercase letters, numbers, hyphens, and underscores';
    }

    if (!formData.title || formData.title.trim() === '') {
      newErrors.title = 'Title is required';
    }

    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    if (!formData.taskCount || formData.taskCount < 1 || formData.taskCount > 20) {
      newErrors.taskCount = 'Task count must be between 1 and 20';
    }

    if (!formData.estimatedMinutes || formData.estimatedMinutes < 5 || formData.estimatedMinutes > 600) {
      newErrors.estimatedMinutes = 'Estimated time must be between 5 and 600 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData as CourseGenerationInput);
  };

  const handleChange = (field: keyof CourseGenerationInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="text-2xl font-bold text-gray-900">Create New Scenario</div>

      {/* Scenario ID */}
      <div>
        <label htmlFor="scenarioId" className="block text-sm font-medium text-gray-700 mb-2">
          Scenario ID *
        </label>
        <input
          type="text"
          id="scenarioId"
          value={formData.scenarioId || ''}
          onChange={(e) => handleChange('scenarioId', e.target.value)}
          placeholder="e.g., ai-ethics-intro"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.scenarioId ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isGenerating}
        />
        {errors.scenarioId && (
          <p className="mt-1 text-sm text-red-600">{errors.scenarioId}</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="e.g., Introduction to AI Ethics"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isGenerating}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe the course content, learning objectives, and what students will achieve..."
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isGenerating}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Mode */}
      <div>
        <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-2">
          Learning Mode *
        </label>
        <select
          id="mode"
          value={formData.mode}
          onChange={(e) => handleChange('mode', e.target.value as 'pbl' | 'discovery' | 'assessment')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isGenerating}
        >
          <option value="pbl">PBL (Problem-Based Learning)</option>
          <option value="discovery">Discovery (Career Exploration)</option>
          <option value="assessment">Assessment</option>
        </select>
      </div>

      {/* Difficulty */}
      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
          Difficulty Level *
        </label>
        <select
          id="difficulty"
          value={formData.difficulty}
          onChange={(e) => handleChange('difficulty', e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'expert')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isGenerating}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Task Count */}
      <div>
        <label htmlFor="taskCount" className="block text-sm font-medium text-gray-700 mb-2">
          Number of Tasks: {formData.taskCount}
        </label>
        <input
          type="range"
          id="taskCount"
          min="1"
          max="20"
          value={formData.taskCount}
          onChange={(e) => handleChange('taskCount', parseInt(e.target.value))}
          className="w-full"
          disabled={isGenerating}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>10</span>
          <span>20</span>
        </div>
        {errors.taskCount && (
          <p className="mt-1 text-sm text-red-600">{errors.taskCount}</p>
        )}
      </div>

      {/* Estimated Time */}
      <div>
        <label htmlFor="estimatedMinutes" className="block text-sm font-medium text-gray-700 mb-2">
          Estimated Time (minutes) *
        </label>
        <input
          type="number"
          id="estimatedMinutes"
          value={formData.estimatedMinutes}
          onChange={(e) => handleChange('estimatedMinutes', parseInt(e.target.value))}
          min="5"
          max="600"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.estimatedMinutes ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isGenerating}
        />
        {errors.estimatedMinutes && (
          <p className="mt-1 text-sm text-red-600">{errors.estimatedMinutes}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isGenerating}
        className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </span>
        ) : (
          'Generate Scenario'
        )}
      </button>
    </form>
  );
}
