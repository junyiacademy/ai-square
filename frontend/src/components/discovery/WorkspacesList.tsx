'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  PauseIcon,
  FolderOpenIcon,
  SparklesIcon,
  TrophyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Import types from the unified service
import type { WorkspaceSession } from '@/lib/services/user-data-service';

interface WorkspacesListProps {
  workspaceSessions: WorkspaceSession[];
  onWorkspaceSelect: (workspaceId: string) => void;
  onCreateWorkspace: (pathId: string) => void;
}

export default function WorkspacesList({ 
  workspaceSessions, 
  onWorkspaceSelect, 
  onCreateWorkspace 
}: WorkspacesListProps) {
  const { t } = useTranslation('discovery');
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'active' | 'completed'>('active');

  // Get path display names
  const getPathDisplayName = (pathId: string) => {
    const pathNames: Record<string, string> = {
      'content_creator': '內容創作者',
      'youtuber': '內容創作者',
      'game_designer': '遊戲設計師', 
      'app_developer': '應用程式開發者'
    };
    return pathNames[pathId] || pathId;
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '剛剛';
    if (diffInHours < 24) return `${diffInHours} 小時前`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  // Get status icon and color
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: PlayIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: '進行中'
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-blue-600', 
          bgColor: 'bg-blue-100',
          label: '已完成'
        };
      case 'paused':
        return {
          icon: PauseIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100', 
          label: '暫停中'
        };
      default:
        return {
          icon: FolderOpenIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: '未知'
        };
    }
  };

  // Group workspaces by status
  const groupedWorkspaces = {
    active: workspaceSessions.filter(ws => ws.status === 'active'),
    paused: workspaceSessions.filter(ws => ws.status === 'paused'), 
    completed: workspaceSessions.filter(ws => ws.status === 'completed')
  };

  if (workspaceSessions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpenIcon className="w-12 h-12 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            還沒有任何工作區
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            開始你的第一次探索之旅！先完成興趣評估，然後選擇一個學習路徑來創建工作區。
          </p>
          <motion.button
            onClick={() => router.push('/discovery/paths')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
          >
            <SparklesIcon className="w-5 h-5" />
            <span>開始興趣評估</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          我的學習工作區
        </h2>
        <p className="text-lg text-gray-600">
          管理你的所有探索歷程，繼續未完成的學習或回顧已完成的成果
        </p>
      </motion.div>


      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8">
        <button
          onClick={() => setActiveTab('active')}
          className={`
            flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all
            ${activeTab === 'active' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <PlayIcon className="w-5 h-5" />
          <span>進行中的學習</span>
          <span className="ml-2 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-sm font-bold">
            {groupedWorkspaces.active.length}
          </span>
          <div className="flex items-center space-x-1 ml-3">
            <TrophyIcon className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">
              {groupedWorkspaces.active.reduce((sum, ws) => sum + ws.totalXP, 0)} XP
            </span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('completed')}
          className={`
            flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all
            ${activeTab === 'completed' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <CheckCircleIcon className="w-5 h-5" />
          <span>已完成的學習</span>
          <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-sm font-bold">
            {groupedWorkspaces.completed.length}
          </span>
          <div className="flex items-center space-x-1 ml-3">
            <TrophyIcon className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">
              {groupedWorkspaces.completed.reduce((sum, ws) => sum + ws.totalXP, 0)} XP
            </span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'active' ? (
        <motion.div
          key="active"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {groupedWorkspaces.active.length > 0 ? (
            <div className="grid gap-4">
              {groupedWorkspaces.active.map((workspace, index) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  pathDisplayName={getPathDisplayName(workspace.pathId)}
                  onResume={() => onWorkspaceSelect(workspace.id)}
                  delay={index * 0.1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayIcon className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">目前沒有進行中的學習</p>
              <motion.button
                onClick={() => router.push('/discovery/paths')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>開始新的學習</span>
              </motion.button>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="completed"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {groupedWorkspaces.completed.length > 0 ? (
            <div className="grid gap-4">
              {groupedWorkspaces.completed.map((workspace, index) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  pathDisplayName={getPathDisplayName(workspace.pathId)}
                  onResume={() => onWorkspaceSelect(workspace.id)}
                  delay={index * 0.1}
                  isCompleted={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">還沒有完成的學習</p>
              <p className="text-sm text-gray-500">繼續努力，完成你的第一個學習工作區！</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Create New Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center py-8 border-t border-gray-200 mt-8"
      >
        <motion.button
          onClick={() => router.push('/discovery/paths')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
        >
          <SparklesIcon className="w-5 h-5" />
          <span>探索新的學習路徑</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

// Workspace Card Component
function WorkspaceCard({ 
  workspace, 
  pathDisplayName, 
  onResume, 
  delay = 0,
  isCompleted = false 
}: {
  workspace: WorkspaceSession;
  pathDisplayName: string;
  onResume: () => void;
  delay?: number;
  isCompleted?: boolean;
}) {
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '剛剛';
    if (diffInHours < 24) return `${diffInHours} 小時前`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: PlayIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: '進行中'
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-blue-600', 
          bgColor: 'bg-blue-100',
          label: '已完成'
        };
      case 'paused':
        return {
          icon: PauseIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100', 
          label: '暫停中'
        };
      default:
        return {
          icon: FolderOpenIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: '未知'
        };
    }
  };

  const statusConfig = getStatusConfig(workspace.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-10 h-10 ${statusConfig.bgColor} rounded-xl flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{pathDisplayName}</h4>
              <p className="text-sm text-gray-500">
                {formatRelativeTime(workspace.lastActiveAt)} • {statusConfig.label}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                完成 {workspace.completedTasks.length} 個任務
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <TrophyIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                獲得 {workspace.totalXP} XP
              </span>
            </div>
          </div>
        </div>
        
        <motion.button
          onClick={onResume}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-colors
            ${isCompleted 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }
          `}
        >
          <PlayIcon className="w-4 h-4" />
          <span>{isCompleted ? '查看' : '繼續'}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}