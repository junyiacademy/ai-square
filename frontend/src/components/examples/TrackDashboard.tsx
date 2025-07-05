/**
 * Track Dashboard 示例組件
 * 展示如何使用新的 Track 系統
 */

import React from 'react';
import { useTrackList, useLearningProgress } from '@/lib/core/track/hooks';
import { TrackType, TrackStatus } from '@/lib/core/track/types';

interface TrackDashboardProps {
  userId: string;
}

export function TrackDashboard({ userId }: TrackDashboardProps) {
  // 使用 Track List Hook
  const {
    tracks,
    loading: tracksLoading,
    error: tracksError,
    stats,
    createTrack,
    deleteTrack
  } = useTrackList({
    userId,
    autoLoad: true,
    pollInterval: 30000 // 每 30 秒更新一次
  });

  // 使用學習進度 Hook
  const {
    progress,
    loading: progressLoading,
    error: progressError,
    refresh: refreshProgress
  } = useLearningProgress({
    userId,
    autoLoad: true
  });

  // 創建新的 PBL Track
  const handleCreatePBLTrack = async () => {
    try {
      await createTrack({
        userId,
        projectId: 'example-project',
        type: TrackType.PBL,
        metadata: {
          title: 'New PBL Adventure',
          language: 'en'
        },
        context: {
          type: 'pbl',
          scenarioId: 'scenario-1',
          programId: 'program-1'
        }
      });
    } catch (error) {
      console.error('Failed to create PBL track:', error);
    }
  };

  // 創建新的 Discovery Track
  const handleCreateDiscoveryTrack = async () => {
    try {
      await createTrack({
        userId,
        projectId: 'example-project',
        type: TrackType.DISCOVERY,
        metadata: {
          title: 'Explore AI Ethics',
          language: 'en'
        },
        context: {
          type: 'discovery',
          workspaceId: 'workspace-' + Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to create Discovery track:', error);
    }
  };

  if (tracksLoading || progressLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (tracksError || progressError) {
    return (
      <div className="p-4 text-red-500">
        Error: {tracksError?.message || progressError?.message}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Learning Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your learning journey across different activities</p>
      </div>

      {/* Overall Progress */}
      {progress && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Overall Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded p-4">
              <div className="text-2xl font-bold text-blue-600">
                {progress.overall.averageScore}%
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="bg-green-50 rounded p-4">
              <div className="text-2xl font-bold text-green-600">
                {progress.overall.completedEvaluations}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-purple-50 rounded p-4">
              <div className="text-2xl font-bold text-purple-600">
                {progress.stats.tracks.total}
              </div>
              <div className="text-sm text-gray-600">Total Tracks</div>
            </div>
            <div className="bg-orange-50 rounded p-4">
              <div className="text-2xl font-bold text-orange-600">
                {progress.overall.trend === 'improving' ? '📈' : 
                 progress.overall.trend === 'declining' ? '📉' : '➡️'}
              </div>
              <div className="text-sm text-gray-600">Trend</div>
            </div>
          </div>
        </div>
      )}

      {/* Track Statistics */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Track Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
              <div className="text-sm text-gray-600">Paused</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.abandoned}</div>
              <div className="text-sm text-gray-600">Abandoned</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Start New Activity</h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleCreatePBLTrack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Start PBL Scenario
          </button>
          <button
            onClick={handleCreateDiscoveryTrack}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            Start Discovery
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Take Assessment
          </button>
          <button
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
          >
            Start AI Chat
          </button>
        </div>
      </div>

      {/* Active Tracks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Activities</h2>
        <div className="space-y-4">
          {tracks.length === 0 ? (
            <p className="text-gray-500">No activities yet. Start a new one above!</p>
          ) : (
            tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                onDelete={() => deleteTrack(track.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Track Card Component
function TrackCard({ track, onDelete }: any) {
  const typeColors = {
    [TrackType.PBL]: 'bg-blue-100 text-blue-800',
    [TrackType.ASSESSMENT]: 'bg-green-100 text-green-800',
    [TrackType.DISCOVERY]: 'bg-purple-100 text-purple-800',
    [TrackType.CHAT]: 'bg-orange-100 text-orange-800'
  };

  const statusColors = {
    [TrackStatus.ACTIVE]: 'bg-green-500',
    [TrackStatus.PAUSED]: 'bg-yellow-500',
    [TrackStatus.COMPLETED]: 'bg-blue-500',
    [TrackStatus.ABANDONED]: 'bg-gray-500'
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[track.type]}`}>
              {track.type.toUpperCase()}
            </span>
            <span className={`w-2 h-2 rounded-full ${statusColors[track.status]}`} />
            <span className="text-sm text-gray-600">{track.status}</span>
          </div>
          <h3 className="font-semibold text-gray-900">
            {track.metadata.title || `${track.type} Activity`}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Started: {new Date(track.startedAt).toLocaleDateString()}
          </p>
          {track.completedAt && (
            <p className="text-sm text-gray-600">
              Completed: {new Date(track.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="text-blue-600 hover:text-blue-800 text-sm">
            View Details
          </button>
          {track.status === TrackStatus.ACTIVE && (
            <button className="text-green-600 hover:text-green-800 text-sm">
              Continue
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}