/**
 * V2 Program Selector Component
 * Allows users to select and switch between programs
 */

import React from 'react';
import { Program } from '@/lib/v2/interfaces/base';
import { CheckCircle2, Circle, Lock, PlayCircle } from 'lucide-react';
import clsx from 'clsx';

interface ProgramSelectorProps {
  programs: Program[];
  activeProgram?: Program;
  onSelect: (program: Program) => void;
  scenarioType: 'pbl' | 'discovery' | 'assessment';
}

export function ProgramSelector({
  programs,
  activeProgram,
  onSelect,
  scenarioType
}: ProgramSelectorProps) {
  // Get program icon based on status
  const getStatusIcon = (program: Program) => {
    switch (program.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'active':
        return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return program.program_order === 0 || 
               programs[program.program_order - 1]?.status === 'completed'
          ? <Circle className="w-5 h-5 text-gray-400" />
          : <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get program type label
  const getProgramTypeLabel = (program: Program) => {
    switch (scenarioType) {
      case 'pbl':
        return program.config.stage_id || `Stage ${program.program_order + 1}`;
      case 'discovery':
        return program.config.scenario_type || 'Exploration';
      case 'assessment':
        return program.config.attempt_type === 'practice' ? 'Practice' : 'Formal';
    }
  };

  // Check if program is selectable
  const isSelectable = (program: Program) => {
    if (program.status === 'completed' || program.status === 'active') {
      return true;
    }
    // First program is always selectable
    if (program.program_order === 0) {
      return true;
    }
    // Check if previous program is completed
    const previousProgram = programs.find(p => p.program_order === program.program_order - 1);
    return previousProgram?.status === 'completed';
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        {scenarioType === 'pbl' && 'Learning Stages'}
        {scenarioType === 'discovery' && 'Career Scenarios'}
        {scenarioType === 'assessment' && 'Assessment Attempts'}
      </h3>

      <div className="space-y-2">
        {programs.map((program) => {
          const selectable = isSelectable(program);
          const isActive = activeProgram?.id === program.id;

          return (
            <button
              key={program.id}
              onClick={() => selectable && onSelect(program)}
              disabled={!selectable}
              className={clsx(
                'w-full text-left p-3 rounded-lg border transition-all',
                {
                  'border-blue-500 bg-blue-50': isActive,
                  'border-gray-200 hover:border-gray-300 hover:bg-gray-50': 
                    !isActive && selectable,
                  'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed': 
                    !selectable
                }
              )}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(program)}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {program.title}
                  </div>
                  {program.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {program.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {getProgramTypeLabel(program)}
                    </span>
                    {program.metadata.total_questions && (
                      <span>{program.metadata.total_questions} questions</span>
                    )}
                    {program.metadata.xp_awarded !== undefined && (
                      <span>{program.metadata.xp_awarded} XP</span>
                    )}
                    {program.metadata.final_score !== undefined && (
                      <span className="font-medium text-gray-700">
                        Score: {Math.round(program.metadata.final_score)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress indicator for active program */}
              {isActive && program.status === 'active' && program.metadata.time_spent && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Time spent</span>
                    <span>{Math.round(program.metadata.time_spent / 60)} min</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Add new program button for Discovery */}
      {scenarioType === 'discovery' && (
        <button
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
          onClick={() => {
            // This would trigger branch exploration UI
            console.log('Add new exploration branch');
          }}
        >
          + Explore New Direction
        </button>
      )}
    </div>
  );
}