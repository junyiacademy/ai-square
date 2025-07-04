'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ChartBarIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import DiscoveryNavigation from '@/components/layout/DiscoveryNavigation';

// Dynamic import to avoid SSR issues
const InterestAssessment = dynamic(
  () => import('@/components/discovery/InterestAssessment'),
  { 
    ssr: false,
    loading: () => <div className="text-center py-8">載入中...</div>
  }
);

// Import types only
import type { AssessmentResults, AssessmentSession, SavedPathData } from '@/lib/services/user-data-service';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';

export default function EvaluationPage() {
  const { t } = useTranslation(['discovery', 'navigation']);
  const router = useRouter();
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [achievementCount, setAchievementCount] = useState(0);
  const [showPathSelection, setShowPathSelection] = useState(false);
  const [newPaths, setNewPaths] = useState<SavedPathData[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string[]>>({});
  const [workspaceCount, setWorkspaceCount] = useState(0);

  // Load existing assessment results
  useEffect(() => {
    const loadData = async () => {
      try {
        // Dynamic import to avoid webpack issues
        const { userDataService } = await import('@/lib/services/user-data-service');
        const userData = await userDataService.loadUserData();
        if (userData?.assessmentResults) {
          setAssessmentResults(userData.assessmentResults);
        }
        setAchievementCount(userData?.achievements?.badges?.length || 0);
        setWorkspaceCount(userData?.workspaceSessions?.length || 0);
        
        // Load the latest assessment session's answers
        if (userData?.assessmentSessions && userData.assessmentSessions.length > 0) {
          const latestSession = userData.assessmentSessions[userData.assessmentSessions.length - 1];
          if (latestSession.answers) {
            setAssessmentAnswers(latestSession.answers);
          }
        }
      } catch (error) {
        console.error('Failed to load assessment data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAssessmentComplete = async (results: AssessmentResults, answers?: Record<string, string[]>) => {
    setAssessmentResults(results);
    if (answers) {
      setAssessmentAnswers(answers);
    }
    
    // Generate recommended paths based on results
    const recommendedPaths = generateRecommendedPaths(results);
    setNewPaths(recommendedPaths);
    
    // Select all paths by default
    setSelectedPaths(new Set(recommendedPaths.map(p => p.id)));
    
    // Show path selection dialog
    setShowPathSelection(true);
  };
  
  const handleConfirmPaths = async () => {
    try {
      const { userDataService } = await import('@/lib/services/user-data-service');
      
      // Create assessment session
      const assessmentSession = {
        id: `assessment_${Date.now()}`,
        createdAt: new Date().toISOString(),
        results: assessmentResults!,
        answers: assessmentAnswers
      };
      
      // Filter paths based on selection
      const pathsToAdd = newPaths.filter(p => selectedPaths.has(p.id));
      
      // Add assessment session with selected paths
      await userDataService.addAssessmentSession(assessmentSession, pathsToAdd);
      
      // Navigate to paths page
      router.push('/discovery/paths');
    } catch (error) {
      console.error('Failed to save assessment results:', error);
    }
  };
  
  const togglePathSelection = (pathId: string) => {
    setSelectedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pathId)) {
        newSet.delete(pathId);
      } else {
        newSet.add(pathId);
      }
      return newSet;
    });
  };
  
  // Helper function to generate recommended paths based on assessment results
  const generateRecommendedPaths = (results: AssessmentResults): SavedPathData[] => {
    const paths: SavedPathData[] = [];
    const timestamp = Date.now();
    const assessmentId = `assessment_${timestamp}`;
    
    // Determine primary interest
    const { tech, creative, business } = results;
    const categories = [
      { name: 'tech', score: tech },
      { name: 'creative', score: creative },
      { name: 'business', score: business }
    ].sort((a, b) => b.score - a.score);
    
    // Generate paths based on score distribution
    const primaryCategory = categories[0];
    const secondaryCategory = categories[1];
    
    // Primary path (highest score)
    if (primaryCategory.name === 'tech') {
      paths.push({
        id: `path_${timestamp}_1`,
        pathData: { id: 'ai_developer' },
        matchPercentage: primaryCategory.score,
        assessmentId,
        isFavorite: false,
        isCustom: false,
        createdAt: new Date().toISOString()
      });
    } else if (primaryCategory.name === 'creative') {
      paths.push({
        id: `path_${timestamp}_1`,
        pathData: { id: 'content_creator' },
        matchPercentage: primaryCategory.score,
        assessmentId,
        isFavorite: false,
        isCustom: false,
        createdAt: new Date().toISOString()
      });
    } else {
      paths.push({
        id: `path_${timestamp}_1`,
        pathData: { id: 'startup_founder' },
        matchPercentage: primaryCategory.score,
        assessmentId,
        isFavorite: false,
        isCustom: false,
        createdAt: new Date().toISOString()
      });
    }
    
    // Secondary path if score is significant
    if (secondaryCategory.score >= 30) {
      const pathId = secondaryCategory.name === 'tech' ? 'data_analyst' :
                     secondaryCategory.name === 'creative' ? 'ux_designer' :
                     'product_manager';
      
      paths.push({
        id: `path_${timestamp}_2`,
        pathData: { id: pathId },
        matchPercentage: secondaryCategory.score,
        assessmentId,
        isFavorite: false,
        isCustom: false,
        createdAt: new Date().toISOString()
      });
    }
    
    // Mixed interest path if scores are balanced
    if (Math.abs(tech - creative) < 10 && Math.abs(tech - business) < 10) {
      paths.push({
        id: `path_${timestamp}_3`,
        pathData: { id: 'tech_entrepreneur' },
        matchPercentage: Math.max(tech, creative, business),
        assessmentId,
        isFavorite: false,
        isCustom: false,
        createdAt: new Date().toISOString()
      });
    }
    
    return paths;
  };

  const handleRetakeAssessment = () => {
    setAssessmentResults(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Discovery Header with Navigation */}
      <DiscoveryHeader 
        hasAssessmentResults={!!assessmentResults}
        achievementCount={achievementCount}
        workspaceCount={workspaceCount}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assessmentResults ? (
          <div className="py-4">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-6 h-6" />
                  <div>
                    <h2 className="text-xl font-bold">評估完成！</h2>
                    <p className="text-purple-100 text-sm">以下是你的興趣評估結果與答題紀錄</p>
                  </div>
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">你的傾向分析</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded bg-blue-50">
                    <div className="text-lg font-bold text-blue-600">{assessmentResults.tech}%</div>
                    <div className="text-xs text-gray-600">科技</div>
                  </div>
                  <div className="text-center p-2 rounded bg-purple-50">
                    <div className="text-lg font-bold text-purple-600">{assessmentResults.creative}%</div>
                    <div className="text-xs text-gray-600">創意</div>
                  </div>
                  <div className="text-center p-2 rounded bg-green-50">
                    <div className="text-lg font-bold text-green-600">{assessmentResults.business}%</div>
                    <div className="text-xs text-gray-600">商業</div>
                  </div>
                </div>
              </div>
              
              {/* Questions and Answers */}
              {Object.keys(assessmentAnswers).length > 0 && (
                <div className="p-4 border-b border-gray-200 max-h-64 overflow-y-auto">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">你的答題紀錄</h3>
                  <div className="space-y-3">
                    {(t('interestAssessment.questions', { returnObjects: true }) as any[]).map((question: any, index: number) => {
                      const selectedOptions = assessmentAnswers[question.id] || [];
                      if (selectedOptions.length === 0) return null;
                      
                      return (
                        <div key={question.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm mb-1">{question.text}</p>
                              <div className="space-y-0.5">
                                {selectedOptions.map(optionId => {
                                  const option = question.options.find((opt: any) => opt.id === optionId);
                                  return option ? (
                                    <div key={optionId} className="flex items-center space-x-1">
                                      <CheckCircleIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                                      <span className="text-xs text-gray-700">{option.text}</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="p-3 bg-gray-50">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => window.location.href = '/discovery/paths'}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 text-sm font-medium"
                  >
                    查看冒險副本
                  </button>
                  <button
                    onClick={handleRetakeAssessment}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 text-sm font-medium"
                  >
                    重新評估
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <InterestAssessment onComplete={handleAssessmentComplete} />
        )}
      </div>

      {/* Navigation */}
      <DiscoveryNavigation />
      
      {/* Path Selection Dialog */}
      {showPathSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">恭喜完成評估！</h3>
                  <p className="text-gray-600 mt-1">根據你的興趣分析，我們為你推薦了以下學習路徑</p>
                </div>
                <button
                  onClick={() => setShowPathSelection(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="space-y-4">
                {newPaths.length === 0 && (
                  <p className="text-center text-gray-500">沒有推薦的路徑</p>
                )}
                {newPaths.map(path => {
                  const pathData = t(`careers.${path.pathData.id}`, { returnObjects: true, defaultValue: null }) as any;
                  const isSelected = selectedPaths.has(path.id);
                  
                  // Fallback data if translation not found
                  const fallbackData = {
                    content_creator: { title: '內容創作者', subtitle: '創作引人入勝的數位內容' },
                    youtuber: { title: 'YouTuber', subtitle: '創作影片內容' },
                    game_designer: { title: '遊戲設計師', subtitle: '設計有趣的遊戲體驗' },
                    app_developer: { title: '應用程式開發者', subtitle: '開發實用的應用程式' },
                    startup_founder: { title: '創業家', subtitle: '打造創新的商業模式' },
                    data_analyst: { title: '數據分析師', subtitle: '從數據中發現洞察' },
                    ux_designer: { title: 'UX 設計師', subtitle: '設計優秀的用戶體驗' },
                    product_manager: { title: '產品經理', subtitle: '管理產品開發流程' },
                    tech_entrepreneur: { title: '科技創業家', subtitle: '結合技術與商業的創新' }
                  };
                  
                  const displayData = pathData && typeof pathData === 'object' 
                    ? pathData 
                    : fallbackData[path.pathData.id as keyof typeof fallbackData] || { 
                        title: path.pathData.id, 
                        subtitle: '探索新的可能性' 
                      };
                  
                  if (!displayData) {
                    return null;
                  }
                  
                  return (
                    <div
                      key={path.id}
                      onClick={() => togglePathSelection(path.id)}
                      className={`
                        p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`
                          w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-all
                          ${isSelected 
                            ? 'bg-purple-500 border-purple-500' 
                            : 'bg-white border-gray-300'
                          }
                        `}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white m-auto" fill="currentColor" viewBox="0 0 12 10">
                              <path d="M10.28.28L3.989 6.575 1.695 4.28A1 1 0 00.28 5.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28.28z" />
                            </svg>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{displayData.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{displayData.subtitle}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-purple-600 font-medium">
                              {path.matchPercentage}% 匹配度
                            </span>
                            {displayData.category && (
                              <span className="text-sm text-gray-500">
                                {displayData.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  已選擇 {selectedPaths.size} 個路徑
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPathSelection(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    稍後決定
                  </button>
                  <button
                    onClick={handleConfirmPaths}
                    disabled={selectedPaths.size === 0}
                    className={`
                      px-6 py-2 rounded-lg font-medium transition-colors
                      ${selectedPaths.size > 0
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }
                    `}
                  >
                    加入選擇的副本
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}