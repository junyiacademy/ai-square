'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Brain, 
  Clock, 
  Target, 
  Zap, 
  Award, 
  ChartBar,
  BookOpen,
  Sparkles,
  Shield,
  Rocket,
  ArrowLeft,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Import the mock data
const assessmentConfigs: Record<string, any> = {
  'quick-literacy': {
    id: 'quick-literacy',
    type: 'quick',
    title: 'Quick AI Literacy Check',
    description: 'A brief assessment to gauge your current AI literacy level across all domains.',
    duration: 15,
    questionCount: 10,
    difficulty: 'mixed',
    domains: ['Engaging_with_AI', 'Creating_with_AI', 'Managing_with_AI', 'Designing_with_AI'],
    icon: <Zap className="w-6 h-6" />,
    color: 'blue',
    outcomes: [
      'Identify your AI literacy strengths',
      'Discover areas for improvement',
      'Get personalized learning recommendations'
    ],
    popularity: 95,
    completionRate: 89,
    detailedDescription: `This quick assessment is designed to give you a snapshot of your current AI literacy level. 
    In just 15 minutes, you'll answer 10 carefully crafted questions that cover all four core domains of AI literacy. 
    The assessment adapts to provide a balanced evaluation of your knowledge, skills, and attitudes toward AI.`,
    sampleQuestions: [
      'What are the key considerations when evaluating AI-generated content?',
      'How can you effectively collaborate with AI tools in creative tasks?',
      'What ethical principles should guide AI implementation in organizations?'
    ],
    targetAudience: [
      'Professionals new to AI',
      'Students exploring AI literacy',
      'Anyone curious about their AI competency level'
    ]
  },
  'comprehensive': {
    id: 'comprehensive',
    type: 'comprehensive',
    title: 'Comprehensive AI Literacy Assessment',
    description: 'An in-depth evaluation covering all aspects of AI literacy with detailed feedback.',
    duration: 45,
    questionCount: 30,
    difficulty: 'mixed',
    domains: ['Engaging_with_AI', 'Creating_with_AI', 'Managing_with_AI', 'Designing_with_AI'],
    icon: <Brain className="w-6 h-6" />,
    color: 'purple',
    prerequisites: ['Basic understanding of AI concepts'],
    outcomes: [
      'Complete AI literacy profile',
      'Detailed competency breakdown',
      'Personalized learning pathway',
      'Certificate of completion'
    ],
    badge: 'AI Literacy Foundation',
    popularity: 78,
    completionRate: 72,
    detailedDescription: `Our most thorough assessment provides a complete evaluation of your AI literacy across all domains. 
    This 45-minute assessment includes 30 questions that progressively evaluate your understanding from basic concepts to advanced applications. 
    Upon completion, you'll receive a detailed report with your competency profile and a personalized learning pathway.`,
    sampleQuestions: [
      'Explain the difference between narrow AI and general AI',
      'How would you design an AI governance framework for a mid-size organization?',
      'What are the implications of AI bias in decision-making systems?'
    ],
    targetAudience: [
      'AI practitioners and professionals',
      'Managers overseeing AI initiatives',
      'Educators teaching AI concepts'
    ]
  }
};

export default function AssessmentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;
  const assessment = assessmentConfigs[assessmentId];

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Assessment not found</p>
          <button
            onClick={() => router.push('/v2/assessment')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-red-600 bg-red-100';
      case 'mixed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 hover:bg-blue-600',
      purple: 'bg-purple-500 hover:bg-purple-600',
      green: 'bg-green-500 hover:bg-green-600',
      orange: 'bg-orange-500 hover:bg-orange-600',
      red: 'bg-red-500 hover:bg-red-600',
      indigo: 'bg-indigo-500 hover:bg-indigo-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/v2/assessment')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assessments
          </button>
          
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-lg ${getColorClasses(assessment.color)} bg-opacity-10`}>
              <div className={`${getColorClasses(assessment.color).replace('hover:', '')} text-white p-3 rounded`}>
                {assessment.icon}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{assessment.title}</h1>
              <p className="text-lg text-gray-600">{assessment.description}</p>
              {assessment.badge && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full mt-3">
                  <Award className="w-4 h-4" />
                  Earn: {assessment.badge}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Duration</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{assessment.duration} min</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">Questions</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{assessment.questionCount}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <ChartBar className="w-4 h-4" />
              <span className="text-sm">Popularity</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{assessment.popularity}%</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Completion</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{assessment.completionRate}%</p>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
          <p className="text-gray-700 leading-relaxed">{assessment.detailedDescription}</p>
        </div>

        {/* Domains Covered */}
        <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Domains Covered</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessment.domains.map((domain: string, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700 font-medium">{domain.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Questions */}
        {assessment.sampleQuestions && (
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sample Questions</h2>
            <div className="space-y-3">
              {assessment.sampleQuestions.map((question: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <p className="text-gray-700">{question}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target Audience */}
        {assessment.targetAudience && (
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Who Should Take This Assessment?</h2>
            <div className="space-y-2">
              {assessment.targetAudience.map((audience: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <span className="text-gray-700">{audience}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {assessment.prerequisites && (
          <div className="bg-amber-50 rounded-lg p-6 mb-6 border border-amber-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Prerequisites</h2>
            <div className="space-y-2">
              {assessment.prerequisites.map((prereq: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span className="text-gray-700">{prereq}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expected Outcomes */}
        <div className="bg-green-50 rounded-lg p-6 mb-8 border border-green-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What You'll Gain</h2>
          <div className="space-y-3">
            {assessment.outcomes.map((outcome: string, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-green-600 mt-0.5" />
                <span className="text-gray-700">{outcome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/v2/assessment')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Back to List
          </button>
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}`)}
            className={`flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${getColorClasses(assessment.color)}`}
          >
            Start Assessment
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}