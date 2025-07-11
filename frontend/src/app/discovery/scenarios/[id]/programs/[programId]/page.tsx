'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
  LockClosedIcon,
  PlayIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description: string;
  xp: number;
  status: 'locked' | 'available' | 'completed';
  completedAt?: string;
}

interface ProgramData {
  id: string;
  scenarioId: string;
  status: 'active' | 'completed' | 'paused';
  completedTasks: number;
  totalTasks: number;
  totalXP: number;
  tasks: Task[];
  createdAt: string;
  lastActiveAt: string;
}

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const { user, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programData, setProgramData] = useState<ProgramData | null>(null);

  const scenarioId = params.id as string;
  const programId = params.programId as string;

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login?redirect=/discovery/scenarios');
      return;
    }

    if (scenarioId && programId) {
      loadProgramData();
    }
  }, [scenarioId, programId, isLoggedIn]);

  const loadProgramData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load program data');
      }

      const data = await response.json();
      setProgramData(data);
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = (taskId: string) => {
    // Navigate to task learning page
    router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`);
  };

  if (loading) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span>載入中...</span>
          </div>
        </div>
      </DiscoveryPageLayout>
    );
  }

  if (!programData) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">找不到此學習歷程</p>
          <button
            onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            返回職業詳情
          </button>
        </div>
      </DiscoveryPageLayout>
    );
  }

  const progress = programData.totalTasks > 0 
    ? Math.round((programData.completedTasks / programData.totalTasks) * 100)
    : 0;

  return (
    <DiscoveryPageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>返回職業詳情</span>
        </button>

        {/* Program Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                學習歷程
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>開始於 {new Date(programData.createdAt).toLocaleDateString('zh-TW')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrophyIcon className="w-4 h-4" />
                  <span>{programData.totalXP} XP</span>
                </div>
              </div>
            </div>
            
            {programData.status === 'active' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                進行中
              </span>
            )}
            {programData.status === 'completed' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                已完成
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">整體進度</span>
              <span className="text-gray-900 font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              已完成 {programData.completedTasks} / {programData.totalTasks} 個任務
            </p>
          </div>
        </div>

        {/* Tasks List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            學習任務
          </h2>
          
          <div className="space-y-4">
            {programData.tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  bg-white rounded-xl shadow-md border transition-all
                  ${task.status === 'available' 
                    ? 'border-purple-200 hover:shadow-lg cursor-pointer' 
                    : 'border-gray-100'
                  }
                  ${task.status === 'completed' ? 'bg-gray-50' : ''}
                `}
                onClick={() => task.status === 'available' && handleStartTask(task.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Task Icon */}
                      <div className={`
                        p-3 rounded-full
                        ${task.status === 'completed' 
                          ? 'bg-green-100' 
                          : task.status === 'available'
                          ? 'bg-purple-100'
                          : 'bg-gray-100'
                        }
                      `}>
                        {task.status === 'completed' && (
                          <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        )}
                        {task.status === 'available' && (
                          <SparklesIcon className="w-6 h-6 text-purple-600" />
                        )}
                        {task.status === 'locked' && (
                          <LockClosedIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Task Content */}
                      <div className="flex-1">
                        <h3 className={`
                          text-lg font-semibold mb-1
                          ${task.status === 'completed' ? 'text-gray-600' : 'text-gray-900'}
                        `}>
                          任務 {index + 1}: {task.title}
                        </h3>
                        <p className={`
                          text-sm mb-2
                          ${task.status === 'completed' ? 'text-gray-500' : 'text-gray-600'}
                        `}>
                          {task.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <TrophyIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-600">{task.xp} XP</span>
                          </div>
                          
                          {task.completedAt && (
                            <span className="text-green-600">
                              完成於 {new Date(task.completedAt).toLocaleDateString('zh-TW')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {task.status === 'available' && (
                      <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        <PlayIcon className="w-4 h-4" />
                        <span>開始</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Generate more tasks if all completed */}
        {programData.completedTasks === programData.totalTasks && programData.totalTasks > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 text-center">
            <TrophyIcon className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              恭喜完成所有任務！
            </h3>
            <p className="text-gray-600 mb-6">
              你已經完成了這個學習歷程的所有任務，獲得了 {programData.totalXP} XP！
            </p>
            <button
              onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>開始新的歷程</span>
            </button>
          </div>
        )}
      </div>
    </DiscoveryPageLayout>
  );
}