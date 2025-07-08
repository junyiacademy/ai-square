/**
 * V2 Scenario Card Component
 * Displays scenario information with progress
 */

import React from 'react';
import { Scenario } from '@/lib/v2/interfaces/base';
import { formatDistanceToNow } from 'date-fns';
import { 
  BookOpen, 
  Compass, 
  GraduationCap, 
  Clock, 
  CheckCircle2,
  PauseCircle,
  XCircle
} from 'lucide-react';

interface ScenarioCardProps {
  scenario: Scenario;
  programs?: number;
  completedTasks?: number;
  totalTasks?: number;
  onClick?: () => void;
}

export function ScenarioCard({
  scenario,
  programs = 0,
  completedTasks = 0,
  totalTasks = 0,
  onClick
}: ScenarioCardProps) {
  // Get icon based on type
  const getIcon = () => {
    switch (scenario.type) {
      case 'pbl':
        return <BookOpen className="w-5 h-5" />;
      case 'discovery':
        return <Compass className="w-5 h-5" />;
      case 'assessment':
        return <GraduationCap className="w-5 h-5" />;
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (scenario.status) {
      case 'active':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      case 'abandoned':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  // Calculate progress
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Get type label
  const getTypeLabel = () => {
    switch (scenario.type) {
      case 'pbl':
        return 'Problem-Based Learning';
      case 'discovery':
        return 'Career Discovery';
      case 'assessment':
        return 'Assessment';
    }
  };

  // Format last active time
  const lastActive = scenario.last_active_at || scenario.created_at;
  const timeAgo = formatDistanceToNow(new Date(lastActive), { addSuffix: true });

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{scenario.title}</h3>
            <p className="text-sm text-gray-500">{getTypeLabel()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-xs text-gray-500 capitalize">{scenario.status}</span>
        </div>
      </div>

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedTasks} / {totalTasks} tasks</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4 text-gray-600">
          {programs > 0 && (
            <div className="flex items-center space-x-1">
              <span className="font-medium">{programs}</span>
              <span>programs</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>
        
        {scenario.status === 'active' && (
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Continue →
          </button>
        )}
      </div>

      {/* Metadata badges */}
      {scenario.metadata.language && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {scenario.metadata.language}
          </span>
          {scenario.metadata.source_code && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {scenario.metadata.source_code}
            </span>
          )}
        </div>
      )}
    </div>
  );
}