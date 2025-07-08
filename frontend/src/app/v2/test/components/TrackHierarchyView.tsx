'use client';

import { TrackWithHierarchy } from '@/lib/v2/types';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, CheckCircle, PlayCircle, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface TrackHierarchyViewProps {
  track: TrackWithHierarchy;
  onTaskClick?: (taskId: string) => void;
}

export function TrackHierarchyView({ track, onTaskClick }: TrackHierarchyViewProps) {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());

  const toggleProgram = (programId: string) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedPrograms(newExpanded);
  };

  const getStructureLabel = () => {
    switch (track.structure_type) {
      case 'standard':
        return 'Standard (Multiple Programs)';
      case 'single_program':
        return 'Single Program (Discovery)';
      case 'direct_task':
        return 'Direct Tasks (Assessment)';
      default:
        return track.structure_type;
    }
  };

  const getTaskIcon = (taskType: string, taskVariant?: string) => {
    if (taskVariant === 'question') return <FileText className="w-4 h-4 text-purple-600" />;
    if (taskVariant === 'exploration') return <BookOpen className="w-4 h-4 text-green-600" />;
    
    switch (taskType) {
      case 'learning':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'practice':
        return <PlayCircle className="w-4 h-4 text-orange-600" />;
      case 'assessment':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Track Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-900">{track.title}</h3>
          <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
            {getStructureLabel()}
          </span>
        </div>
        <p className="text-gray-600 text-sm">{track.description}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span>Code: {track.code}</span>
          <span>Created: {new Date(track.created_at).toLocaleDateString()}</span>
          {track.metadata?.difficulty && (
            <span className="capitalize">Difficulty: {track.metadata.difficulty}</span>
          )}
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Structure Hierarchy</h4>
        
        {/* Programs */}
        {track.programs.map((program) => {
          const isExpanded = expandedPrograms.has(program.id);
          const isVirtual = program.is_virtual;
          
          return (
            <div key={program.id} className="mb-3">
              {/* Program Header */}
              <div 
                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                  isVirtual ? 'opacity-60' : ''
                }`}
                onClick={() => toggleProgram(program.id)}
              >
                {isExpanded ? 
                  <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                }
                {isExpanded ? 
                  <FolderOpen className="w-4 h-4 text-yellow-600" /> : 
                  <Folder className="w-4 h-4 text-yellow-600" />
                }
                <span className="text-sm font-medium text-gray-800">
                  {program.title}
                  {isVirtual && <span className="ml-2 text-xs text-gray-500">(virtual)</span>}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  {program.tasks.length} tasks
                </span>
              </div>

              {/* Tasks */}
              {isExpanded && (
                <div className="ml-8 mt-1">
                  {program.tasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => onTaskClick?.(task.id)}
                    >
                      {getTaskIcon(task.task_type, task.task_variant)}
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">{task.title}</span>
                        {task.task_variant && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({task.task_variant})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {task.estimated_minutes ? `${task.estimated_minutes} min` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Metadata Display */}
      {track.metadata && Object.keys(track.metadata).length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Track Metadata</h4>
          <div className="bg-gray-50 rounded p-3">
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(track.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}