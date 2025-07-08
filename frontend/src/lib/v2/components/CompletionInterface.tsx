'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy, 
  Clock, 
  Target, 
  Award, 
  Download, 
  RefreshCw,
  ChevronRight,
  CheckCircle,
  Star,
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react';

interface BaseCompletionData {
  // 基本資訊
  completedAt: Date;
  timeSpent: number; // in seconds
  
  // 完成狀態
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number; // 0-100
  
  // 基礎評估
  overallScore?: number; // 0-100
  performance?: 'excellent' | 'good' | 'satisfactory' | 'needs-improvement';
  
  // Domain Scores (4 個 AI 素養領域)
  domainScores: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  
  // KSA Scores
  ksaScores: {
    knowledge: number; // 0-100
    skills: number;    // 0-100
    attitudes: number; // 0-100
  };
  
  // KSA Details (哪些具體的 KSA 被展現)
  ksaDemonstrated?: {
    knowledge: string[]; // e.g., ['K1.1', 'K1.2', 'K2.1']
    skills: string[];    // e.g., ['S1.1', 'S2.1']
    attitudes: string[]; // e.g., ['A1.1', 'A2.1']
  };
  
  // 核心成果
  keyAchievements: string[];
  skillsDeveloped: string[];
  
  // 下一步
  nextSteps: string[];
  recommendedActions: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
}

interface CompletionInterfaceProps {
  type: 'assessment' | 'pbl' | 'discovery';
  scenarioTitle: string;
  programTitle: string;
  data: BaseCompletionData;
  onClose?: () => void;
}

export function CompletionInterface({ 
  type, 
  scenarioTitle, 
  programTitle, 
  data,
  onClose 
}: CompletionInterfaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'next-steps'>('overview');
  
  // Domain name mapping
  const domainNames: Record<string, string> = {
    engaging_with_ai: 'Engaging with AI',
    creating_with_ai: 'Creating with AI',
    managing_with_ai: 'Managing with AI',
    designing_with_ai: 'Designing with AI'
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getPerformanceColor = (performance?: string) => {
    switch (performance) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-blue-600 bg-blue-100';
      case 'satisfactory':
        return 'text-yellow-600 bg-yellow-100';
      case 'needs-improvement':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCompletionMessage = () => {
    switch (type) {
      case 'assessment':
        return 'Assessment Complete!';
      case 'pbl':
        return 'Learning Journey Complete!';
      case 'discovery':
        return 'Exploration Complete!';
    }
  };

  const getCompletionSubtitle = () => {
    switch (type) {
      case 'assessment':
        return 'Your skills have been evaluated';
      case 'pbl':
        return 'You\'ve completed all learning tasks';
      case 'discovery':
        return 'You\'ve explored new possibilities';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Celebration Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 rounded-full mb-4 animate-bounce">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {getCompletionMessage()}
          </h1>
          <p className="text-xl text-gray-600">
            {getCompletionSubtitle()}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Scenario Info */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <h2 className="text-2xl font-semibold mb-2">{scenarioTitle}</h2>
            <p className="text-blue-100">{programTitle}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(data.timeSpent)}
              </div>
              <div className="text-sm text-gray-500">Time Spent</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.tasksCompleted}/{data.totalTasks}
              </div>
              <div className="text-sm text-gray-500">Tasks Completed</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.completionRate}%
              </div>
              <div className="text-sm text-gray-500">Completion Rate</div>
            </div>
            
            {data.overallScore !== undefined && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Star className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.overallScore}%
                </div>
                <div className="text-sm text-gray-500">Overall Score</div>
              </div>
            )}
          </div>

          {/* Performance Badge */}
          {data.performance && (
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Performance Level</span>
                <span className={`px-4 py-2 rounded-full font-medium capitalize ${getPerformanceColor(data.performance)}`}>
                  {data.performance.replace('-', ' ')}
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b">
            <nav className="flex">
              {(['overview', 'achievements', 'next-steps'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'achievements' && 'Achievements'}
                  {tab === 'next-steps' && 'Next Steps'}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Completion Summary */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Completion Summary</h3>
                  <p className="text-blue-700">
                    You've successfully completed {data.tasksCompleted} out of {data.totalTasks} tasks 
                    in {formatTime(data.timeSpent)}. 
                    {data.overallScore && ` Your overall score is ${data.overallScore}%.`}
                  </p>
                </div>

                {/* Domain Scores */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">AI Literacy Domain Scores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(data.domainScores).map(([domain, score]) => (
                      <div key={domain} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {domainNames[domain]}
                          </span>
                          <span className={`text-lg font-bold ${
                            score >= 80 ? 'text-green-600' : 
                            score >= 60 ? 'text-blue-600' : 
                            score >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              score >= 80 ? 'bg-green-500' : 
                              score >= 60 ? 'bg-blue-500' : 
                              score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KSA Scores */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Knowledge, Skills & Attitudes</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {data.ksaScores.knowledge}%
                      </div>
                      <div className="text-sm font-medium text-blue-800">Knowledge</div>
                      {data.ksaDemonstrated?.knowledge && (
                        <div className="text-xs text-blue-600 mt-2">
                          {data.ksaDemonstrated.knowledge.length} areas
                        </div>
                      )}
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {data.ksaScores.skills}%
                      </div>
                      <div className="text-sm font-medium text-green-800">Skills</div>
                      {data.ksaDemonstrated?.skills && (
                        <div className="text-xs text-green-600 mt-2">
                          {data.ksaDemonstrated.skills.length} areas
                        </div>
                      )}
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {data.ksaScores.attitudes}%
                      </div>
                      <div className="text-sm font-medium text-purple-800">Attitudes</div>
                      {data.ksaDemonstrated?.attitudes && (
                        <div className="text-xs text-purple-600 mt-2">
                          {data.ksaDemonstrated.attitudes.length} areas
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual Progress */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Progress Overview</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Completion</span>
                        <span className="font-medium">{data.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${data.completionRate}%` }}
                        />
                      </div>
                    </div>
                    
                    {data.overallScore !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Overall Performance</span>
                          <span className="font-medium">{data.overallScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${data.overallScore}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Completion Time */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Completed on</p>
                      <p className="font-medium">{data.completedAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Total time</p>
                      <p className="font-medium">{formatTime(data.timeSpent)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="space-y-6">
                {/* Key Achievements */}
                {data.keyAchievements.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Key Achievements
                    </h3>
                    <div className="space-y-2">
                      {data.keyAchievements.map((achievement, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <p className="text-gray-700">{achievement}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Developed */}
                {data.skillsDeveloped.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Skills Developed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.skillsDeveloped.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* KSA Demonstrated */}
                {data.ksaDemonstrated && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Competencies Demonstrated</h3>
                    <div className="space-y-3">
                      {data.ksaDemonstrated.knowledge.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">Knowledge Areas</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {data.ksaDemonstrated.knowledge.map((code, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.ksaDemonstrated.skills.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-green-900 mb-2">Skills Areas</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {data.ksaDemonstrated.skills.map((code, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-mono">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.ksaDemonstrated.attitudes.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-purple-900 mb-2">Attitudes Areas</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {data.ksaDemonstrated.attitudes.map((code, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Learning Stats */}
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Learning Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-indigo-600">Tasks Completed</p>
                      <p className="text-2xl font-bold text-indigo-900">{data.tasksCompleted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-indigo-600">Time Invested</p>
                      <p className="text-2xl font-bold text-indigo-900">{formatTime(data.timeSpent)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'next-steps' && (
              <div className="space-y-6">
                {/* Recommended Next Steps */}
                {data.nextSteps.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Recommended Next Steps</h3>
                    <div className="space-y-3">
                      {data.nextSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {data.recommendedActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        action.variant === 'primary'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {action.label}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                {/* Additional Options */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">Additional Options</p>
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Report
                    </button>
                    <button className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        {onClose && (
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Close and return to scenarios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}