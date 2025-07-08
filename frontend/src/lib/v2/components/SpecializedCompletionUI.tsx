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
  BarChart3,
  Brain,
  Lightbulb,
  Compass,
  Users,
  BookOpen,
  Briefcase,
  Rocket,
  Medal,
  ArrowRight,
  Zap
} from 'lucide-react';
import {
  DynamicRadar as Radar,
  DynamicRadarChart as RadarChart,
  DynamicPolarGrid as PolarGrid,
  DynamicPolarAngleAxis as PolarAngleAxis,
  DynamicPolarRadiusAxis as PolarRadiusAxis,
  DynamicResponsiveContainer as ResponsiveContainer
} from '@/lib/dynamic-imports';
import { KnowledgeGraphVisualization } from './KnowledgeGraphVisualization';

// Task interface for TaskReview
interface Task {
  id: string;
  title: string;
  type: 'question' | 'conversation' | 'task' | 'reflection';
  content: string;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correct_answer?: string;
  explanation?: string;
  userResponse?: string;
  isCorrect?: boolean;
  timestamp?: Date;
  metadata?: {
    duration?: number;
    turns?: number;
    score?: number;
  };
}

// Extended completion data for specialized modes
interface AssessmentCompletionData {
  // Base data
  completedAt: Date;
  timeSpent: number;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  overallScore?: number;
  performance?: 'excellent' | 'good' | 'satisfactory' | 'needs-improvement';
  domainScores: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  ksaScores: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
  ksaDemonstrated?: {
    knowledge: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
    skills: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
    attitudes: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
  };
  keyAchievements: string[];
  skillsDeveloped: string[];
  nextSteps: string[];
  recommendedActions: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
  tasks?: Task[]; // Optional tasks for TaskReview
  
  // Assessment-specific
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  correctAnswers: number;
  totalQuestions: number;
  recommendations: string[];
  detailedAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
  assessmentId?: string; // For navigation
  sessionId?: string; // For navigation
}

interface PBLCompletionData {
  // Base data (same as above)
  completedAt: Date;
  timeSpent: number;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  overallScore?: number;
  performance?: 'excellent' | 'good' | 'satisfactory' | 'needs-improvement';
  domainScores: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  ksaScores: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
  ksaDemonstrated?: {
    knowledge: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
    skills: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
    attitudes: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
  };
  keyAchievements: string[];
  skillsDeveloped: string[];
  nextSteps: string[];
  recommendedActions: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
  tasks?: Task[]; // Optional tasks for TaskReview
  
  // PBL-specific
  journeyMilestones: Array<{
    title: string;
    description: string;
    completed: boolean;
    timestamp?: Date;
  }>;
  problemsSolved: number;
  collaborationScore?: number;
  appliedConcepts: string[];
  reflections?: string[];
}

interface DiscoveryCompletionData {
  // Base data (same as above)
  completedAt: Date;
  timeSpent: number;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  overallScore?: number;
  performance?: 'excellent' | 'good' | 'satisfactory' | 'needs-improvement';
  domainScores: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  ksaScores: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
  ksaDemonstrated?: {
    knowledge: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
    skills: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
    attitudes: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
    }>;
  };
  keyAchievements: string[];
  skillsDeveloped: string[];
  nextSteps: string[];
  recommendedActions: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
  tasks?: Task[]; // Optional tasks for TaskReview
  
  // Discovery-specific
  careerFit: {
    role: string;
    fitScore: number;
    requiredSkills: string[];
    matchedSkills: string[];
    gaps: string[];
  };
  exploredAreas: string[];
  interestLevel: 'low' | 'medium' | 'high' | 'very-high';
  pathwayRecommendations: Array<{
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
  }>;
}

type CompletionData = AssessmentCompletionData | PBLCompletionData | DiscoveryCompletionData;

interface SpecializedCompletionUIProps {
  type: 'assessment' | 'pbl' | 'discovery';
  scenarioTitle: string;
  programTitle: string;
  data: CompletionData;
  onClose?: () => void;
}

export function SpecializedCompletionUI({ 
  type, 
  scenarioTitle, 
  programTitle, 
  data,
  onClose 
}: SpecializedCompletionUIProps) {
  const router = useRouter();
  
  // Type guards
  const isAssessment = (d: CompletionData): d is AssessmentCompletionData => type === 'assessment';
  const isPBL = (d: CompletionData): d is PBLCompletionData => type === 'pbl';
  const isDiscovery = (d: CompletionData): d is DiscoveryCompletionData => type === 'discovery';
  
  // Render specialized content based on type
  const renderSpecializedContent = () => {
    if (isAssessment(data)) {
      return <AssessmentCompletion data={data} />;
    } else if (isPBL(data)) {
      return <PBLCompletion data={data} />;
    } else if (isDiscovery(data)) {
      return <DiscoveryCompletion data={data} />;
    }
  };
  
  const getCompletionIcon = () => {
    switch (type) {
      case 'assessment':
        return <Brain className="w-10 h-10 text-white" />;
      case 'pbl':
        return <Lightbulb className="w-10 h-10 text-white" />;
      case 'discovery':
        return <Compass className="w-10 h-10 text-white" />;
    }
  };
  
  const getCompletionColor = () => {
    switch (type) {
      case 'assessment':
        return 'from-blue-500 to-indigo-600';
      case 'pbl':
        return 'from-green-500 to-emerald-600';
      case 'discovery':
        return 'from-purple-500 to-pink-600';
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Celebration Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${getCompletionColor()} rounded-full mb-4 animate-bounce shadow-lg`}>
            {getCompletionIcon()}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {getCompletionMessage()}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {scenarioTitle}
          </p>
          <p className="text-lg text-gray-500">
            {programTitle}
          </p>
        </div>
        
        {/* Main Content */}
        {renderSpecializedContent()}
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {data.recommendedActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${
                action.variant === 'primary'
                  ? `bg-gradient-to-r ${getCompletionColor()} text-white shadow-lg hover:shadow-xl`
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
              }`}
            >
              {action.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          ))}
        </div>
        
        {/* Close Button */}
        {onClose && (
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Close and return to scenarios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Assessment-specific completion component
function AssessmentCompletion({ data }: { data: AssessmentCompletionData }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'recommendations' | 'knowledge-graph'>('overview');
  
  const domainNames: Record<string, string> = {
    engaging_with_ai: 'Engaging with AI',
    creating_with_ai: 'Creating with AI',
    managing_with_ai: 'Managing with AI',
    designing_with_ai: 'Designing with AI'
  };
  
  const radarData = Object.entries(data.domainScores).map(([domain, score]) => ({
    domain: domainNames[domain],
    score,
    fullMark: 100
  }));
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-green-700 bg-green-100';
      case 'advanced': return 'text-blue-700 bg-blue-100';
      case 'intermediate': return 'text-yellow-700 bg-yellow-100';
      case 'beginner': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Level Badge */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Your AI Literacy Level</h2>
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${getLevelColor(data.level)}`}>
              {data.level.charAt(0).toUpperCase() + data.level.slice(1)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{data.overallScore}%</div>
            <div className="text-blue-100">Overall Score</div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {data.correctAnswers}/{data.totalQuestions}
          </div>
          <div className="text-sm text-gray-500">Correct Answers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatTime(data.timeSpent)}
          </div>
          <div className="text-sm text-gray-500">Time Spent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {data.completionRate}%
          </div>
          <div className="text-sm text-gray-500">Completion Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {data.skillsDeveloped.length}
          </div>
          <div className="text-sm text-gray-500">Skills Identified</div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b">
        <nav className="flex">
          {(['overview', 'analysis', 'recommendations', 'knowledge-graph'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab === 'knowledge-graph' ? 'Knowledge Graph' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Domain Competency */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Domain Competency</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Your Score"
                          dataKey="score"
                          stroke="#4f46e5"
                          fill="#4f46e5"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Progress Bars */}
                  <div className="space-y-4">
                    {Object.entries(data.domainScores).map(([domain, score]) => {
                      const getScoreColor = (score: number) => {
                        if (score >= 80) return 'bg-green-500';
                        if (score >= 60) return 'bg-yellow-500';
                        return 'bg-red-500';
                      };
                      
                      const getScoreLabel = (score: number) => {
                        if (score >= 80) return 'Excellent';
                        if (score >= 60) return 'Good';
                        return 'Needs Improvement';
                      };
                      
                      return (
                        <div key={domain} className="bg-white rounded-lg p-4 shadow-sm border">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {domainNames[domain]}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900">{score}%</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                score >= 80 ? 'bg-green-100 text-green-700' :
                                score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {getScoreLabel(score)}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${getScoreColor(score)}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Overall Score */}
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-indigo-900 text-sm">
                          Overall AI Literacy
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-indigo-900">{data.overallScore || 0}%</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            (data.overallScore || 0) >= 80 ? 'bg-green-100 text-green-700' :
                            (data.overallScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {(data.overallScore || 0) >= 80 ? 'Expert' :
                             (data.overallScore || 0) >= 60 ? 'Proficient' : 'Developing'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-4">
                        <div 
                          className="h-4 rounded-full bg-indigo-600 transition-all duration-700"
                          style={{ width: `${data.overallScore || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* KSA Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">KSA Assessment</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{data.ksaScores.knowledge}%</div>
                  <div className="text-sm font-medium text-blue-800">Knowledge</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {data.ksaDemonstrated?.knowledge.length || 0} competencies
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{data.ksaScores.skills}%</div>
                  <div className="text-sm font-medium text-green-800">Skills</div>
                  <div className="text-xs text-green-600 mt-1">
                    {data.ksaDemonstrated?.skills.length || 0} competencies
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{data.ksaScores.attitudes}%</div>
                  <div className="text-sm font-medium text-purple-800">Attitudes</div>
                  <div className="text-xs text-purple-600 mt-1">
                    {data.ksaDemonstrated?.attitudes.length || 0} competencies
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'analysis' && data.detailedAnalysis && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Strengths
              </h3>
              <div className="space-y-2">
                {data.detailedAnalysis.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{strength}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Areas for Improvement
              </h3>
              <div className="space-y-2">
                {data.detailedAnalysis.weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{weakness}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Opportunities
              </h3>
              <div className="space-y-2">
                {data.detailedAnalysis.opportunities.map((opportunity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Rocket className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{opportunity}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Personalized Recommendations</h3>
              <div className="space-y-3">
                {data.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-200 text-yellow-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Next Learning Steps</h4>
              <div className="space-y-2">
                {data.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                    <p className="text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'knowledge-graph' && data.ksaDemonstrated && (
          <div className="space-y-6">
            <KnowledgeGraphVisualization
              overallScore={data.overallScore}
              ksaDemonstrated={data.ksaDemonstrated}
              tasks={data.tasks || []}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// PBL-specific completion component
function PBLCompletion({ data }: { data: PBLCompletionData }) {
  const [activeTab, setActiveTab] = useState<'journey' | 'skills' | 'reflection'>('journey');
  
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Learning Journey Completed</h2>
            <p className="text-green-100">You've successfully completed {data.problemsSolved} problem-solving tasks</p>
          </div>
          <div className="text-right">
            <Medal className="w-12 h-12 text-yellow-300" />
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
        <div className="text-center">
          <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{data.collaborationScore || 85}%</div>
          <div className="text-sm text-gray-500">Collaboration</div>
        </div>
        <div className="text-center">
          <Target className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{data.problemsSolved}</div>
          <div className="text-sm text-gray-500">Problems Solved</div>
        </div>
        <div className="text-center">
          <BookOpen className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{data.appliedConcepts.length}</div>
          <div className="text-sm text-gray-500">Concepts Applied</div>
        </div>
        <div className="text-center">
          <Award className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{data.keyAchievements.length}</div>
          <div className="text-sm text-gray-500">Achievements</div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b">
        <nav className="flex">
          {(['journey', 'skills', 'reflection'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab === 'journey' && 'Journey Timeline'}
              {tab === 'skills' && 'Skills & Concepts'}
              {tab === 'reflection' && 'Reflection'}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'journey' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Your Learning Journey</h3>
            <div className="relative">
              {data.journeyMilestones.map((milestone, index) => (
                <div key={index} className="flex gap-4 mb-6 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      milestone.completed 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {milestone.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    {index < data.journeyMilestones.length - 1 && (
                      <div className="w-0.5 h-16 bg-gray-300 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <h4 className={`font-medium ${milestone.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                      {milestone.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    {milestone.timestamp && (
                      <p className="text-xs text-gray-500 mt-2">
                        Completed at {milestone.timestamp.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Applied Concepts</h3>
              <div className="flex flex-wrap gap-2">
                {data.appliedConcepts.map((concept, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills Developed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.skillsDeveloped.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Key Achievements</h4>
              <ul className="space-y-2">
                {data.keyAchievements.map((achievement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'reflection' && (
          <div className="space-y-6">
            {data.reflections && data.reflections.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Reflections</h3>
                <div className="space-y-3">
                  {data.reflections.map((reflection, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 italic">"{reflection}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No reflections recorded for this journey</p>
              </div>
            )}
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Learning Summary</h4>
              <p className="text-blue-700">
                Through this problem-based learning experience, you've demonstrated strong {data.performance} performance
                across {data.tasksCompleted} tasks. Your journey showcased particular strength in collaborative
                problem-solving and practical application of AI concepts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Discovery-specific completion component
function DiscoveryCompletion({ data }: { data: DiscoveryCompletionData }) {
  const [activeTab, setActiveTab] = useState<'career' | 'exploration' | 'pathways'>('career');
  
  const getInterestColor = (level: string) => {
    switch (level) {
      case 'very-high': return 'text-purple-700 bg-purple-100';
      case 'high': return 'text-blue-700 bg-blue-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'low': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Career Discovery Complete</h2>
            <p className="text-purple-100">You've explored {data.exploredAreas.length} different career areas</p>
          </div>
          <div>
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getInterestColor(data.interestLevel)}`}>
              {data.interestLevel.replace('-', ' ').toUpperCase()} Interest
            </div>
          </div>
        </div>
      </div>
      
      {/* Career Fit Card */}
      <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Career Match</h3>
          <Briefcase className="w-6 h-6 text-purple-600" />
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xl font-bold text-gray-900">{data.careerFit.role}</h4>
            <div className="text-2xl font-bold text-purple-600">{data.careerFit.fitScore}%</div>
          </div>
          <div className="text-sm text-gray-600 mb-3">Career Fit Score</div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${data.careerFit.fitScore}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">Matched Skills ({data.careerFit.matchedSkills.length})</p>
              <div className="flex flex-wrap gap-1">
                {data.careerFit.matchedSkills.slice(0, 3).map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {skill}
                  </span>
                ))}
                {data.careerFit.matchedSkills.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    +{data.careerFit.matchedSkills.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Skill Gaps ({data.careerFit.gaps.length})</p>
              <div className="flex flex-wrap gap-1">
                {data.careerFit.gaps.slice(0, 3).map((gap, index) => (
                  <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                    {gap}
                  </span>
                ))}
                {data.careerFit.gaps.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    +{data.careerFit.gaps.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b">
        <nav className="flex">
          {(['career', 'exploration', 'pathways'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab === 'career' && 'Career Analysis'}
              {tab === 'exploration' && 'Exploration Summary'}
              {tab === 'pathways' && 'Learning Pathways'}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'career' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills Analysis</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills You Have</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.careerFit.matchedSkills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills to Develop</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.careerFit.gaps.map((gap, index) => (
                      <span key={index} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        <Target className="w-3 h-3 inline mr-1" />
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">Career Readiness</h4>
              <p className="text-purple-700 text-sm">
                Based on your exploration, you have {data.careerFit.fitScore}% of the skills needed for a
                {' '}{data.careerFit.role} role. Focus on developing the identified skill gaps to increase
                your readiness.
              </p>
            </div>
          </div>
        )}
        
        {activeTab === 'exploration' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Areas Explored</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.exploredAreas.map((area, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Compass className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">{area}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Discoveries</h3>
              <ul className="space-y-2">
                {data.keyAchievements.map((achievement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'pathways' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommended Learning Pathways</h3>
            {data.pathwayRecommendations.map((pathway, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{pathway.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    pathway.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                    pathway.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {pathway.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{pathway.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pathway.estimatedTime}
                  </span>
                  <button className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                    Start Learning
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}