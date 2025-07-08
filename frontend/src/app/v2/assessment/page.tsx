'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
  Eye,
  ArrowRight,
  Info,
  BarChart3
} from 'lucide-react';

interface Assessment {
  id: string;
  type: 'quick' | 'comprehensive' | 'domain' | 'adaptive' | 'certification';
  title: string;
  description: string;
  duration: number; // in minutes
  questionCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  domains: string[];
  icon: React.ReactNode;
  color: string;
  prerequisites?: string[];
  outcomes: string[];
  badge?: string;
  popularity?: number;
  completionRate?: number;
  isAvailable?: boolean;
  comingSoon?: boolean;
}

const mockAssessments: Assessment[] = [
  {
    id: 'comprehensive',
    type: 'comprehensive',
    title: 'Comprehensive AI Literacy Assessment',
    description: 'An in-depth evaluation covering all aspects of AI literacy with detailed feedback.',
    duration: 15,
    questionCount: 12,
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
    isAvailable: true
  },
  {
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
    isAvailable: false,
    comingSoon: true
  },
  {
    id: 'engaging-domain',
    type: 'domain',
    title: 'Engaging with AI - Domain Assessment',
    description: 'Focus on your ability to interact with and understand AI systems effectively.',
    duration: 20,
    questionCount: 15,
    difficulty: 'intermediate',
    domains: ['Engaging_with_AI'],
    icon: <Sparkles className="w-6 h-6" />,
    color: 'green',
    outcomes: [
      'Assess AI interaction skills',
      'Understand AI system capabilities',
      'Learn best practices for AI engagement'
    ],
    popularity: 82,
    completionRate: 85,
    isAvailable: false,
    comingSoon: true
  },
  {
    id: 'creating-domain',
    type: 'domain',
    title: 'Creating with AI - Domain Assessment',
    description: 'Evaluate your skills in using AI tools for creative and productive tasks.',
    duration: 25,
    questionCount: 18,
    difficulty: 'intermediate',
    domains: ['Creating_with_AI'],
    icon: <Rocket className="w-6 h-6" />,
    color: 'orange',
    outcomes: [
      'Measure AI creation capabilities',
      'Discover new AI tools and techniques',
      'Improve prompt engineering skills'
    ],
    popularity: 88,
    completionRate: 80,
    isAvailable: false,
    comingSoon: true
  },
  {
    id: 'managing-domain',
    type: 'domain',
    title: 'Managing with AI - Domain Assessment',
    description: 'Test your knowledge of AI governance, ethics, and responsible use.',
    duration: 20,
    questionCount: 15,
    difficulty: 'advanced',
    domains: ['Managing_with_AI'],
    icon: <Shield className="w-6 h-6" />,
    color: 'red',
    prerequisites: ['Understanding of AI ethics', 'Basic AI implementation knowledge'],
    outcomes: [
      'Evaluate AI governance understanding',
      'Learn ethical AI practices',
      'Understand risk management in AI'
    ],
    popularity: 65,
    completionRate: 68,
    isAvailable: false,
    comingSoon: true
  },
  {
    id: 'adaptive-personalized',
    type: 'adaptive',
    title: 'Adaptive AI Literacy Assessment',
    description: 'A smart assessment that adjusts difficulty based on your responses for optimal evaluation.',
    duration: 30,
    questionCount: 20,
    difficulty: 'mixed',
    domains: ['Engaging_with_AI', 'Creating_with_AI', 'Managing_with_AI', 'Designing_with_AI'],
    icon: <ChartBar className="w-6 h-6" />,
    color: 'indigo',
    outcomes: [
      'Personalized difficulty adjustment',
      'Accurate skill level measurement',
      'Targeted learning recommendations',
      'Adaptive learning pathway'
    ],
    badge: 'Adaptive Learner',
    popularity: 70,
    completionRate: 76,
    isAvailable: false,
    comingSoon: true
  }
];

export default function AssessmentListPage() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState<'all' | 'quick' | 'comprehensive' | 'domain' | 'adaptive'>('all');
  const [comprehensiveAssessment, setComprehensiveAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real assessment config
  useEffect(() => {
    const fetchAssessmentConfig = async () => {
      try {
        const response = await fetch(`/api/v2/assessment/config?lang=${i18n.language}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const config = result.data;
          // Update comprehensive assessment with real data
          const updatedAssessment: Assessment = {
            id: config.id,
            type: config.type,
            title: config.title,
            description: config.description,
            duration: config.duration,
            questionCount: config.questionCount,
            difficulty: config.difficulty,
            domains: config.domains.map((d: any) => d.name),
            icon: <Brain className="w-6 h-6" />,
            color: 'purple',
            prerequisites: ['Basic understanding of AI concepts'],
            outcomes: [
              'Complete AI literacy profile',
              'Detailed competency breakdown',
              'Personalized learning pathway',
              'Certificate of completion'
            ],
            badge: config.badge,
            popularity: config.popularity,
            completionRate: config.completionRate,
            isAvailable: config.isAvailable
          };
          setComprehensiveAssessment(updatedAssessment);
        }
      } catch (error) {
        console.error('Error fetching assessment config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentConfig();
  }, [i18n.language]);

  // Combine real comprehensive assessment with other mock assessments
  const allAssessments = comprehensiveAssessment 
    ? [comprehensiveAssessment, ...mockAssessments.filter(a => a.id !== 'comprehensive')]
    : mockAssessments;

  const filteredAssessments = allAssessments.filter(assessment => 
    filter === 'all' || assessment.type === filter
  );

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setShowDetails(true);
  };

  const handleStartAssessment = (assessmentId: string) => {
    router.push(`/v2/assessment/${assessmentId}`);
  };

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Literacy Assessments</h1>
          <p className="text-gray-600">Choose an assessment to evaluate and improve your AI literacy skills</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            All Assessments
          </button>
          <button
            onClick={() => setFilter('quick')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'quick' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Quick
          </button>
          <button
            onClick={() => setFilter('comprehensive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'comprehensive' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Comprehensive
          </button>
          <button
            onClick={() => setFilter('domain')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'domain' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Domain-Specific
          </button>
          <button
            onClick={() => setFilter('adaptive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'adaptive' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Adaptive
          </button>
        </div>

        {/* Assessment Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
            <div
              key={assessment.id}
              className={`bg-white rounded-xl shadow-sm transition-shadow p-6 border ${
                assessment.isAvailable !== false ? 'hover:shadow-md border-gray-200' : 'border-gray-200 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${assessment.isAvailable !== false ? getColorClasses(assessment.color) : 'bg-gray-400'} bg-opacity-10`}>
                  <div className={`${assessment.isAvailable !== false ? getColorClasses(assessment.color).replace('hover:', '') : 'bg-gray-400'} text-white p-2 rounded`}>
                    {assessment.icon}
                  </div>
                </div>
                {assessment.comingSoon ? (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                ) : assessment.badge && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                    <Award className="w-3 h-3" />
                    {assessment.badge}
                  </span>
                )}
              </div>

              {/* Title and Description */}
              <h3 className={`text-lg font-semibold mb-2 ${assessment.isAvailable !== false ? 'text-gray-900' : 'text-gray-500'}`}>
                {assessment.title}
              </h3>
              <p className={`text-sm mb-4 ${assessment.isAvailable !== false ? 'text-gray-600' : 'text-gray-400'}`}>
                {assessment.description}
              </p>

              {/* Metadata */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-1 ${assessment.isAvailable !== false ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Clock className="w-4 h-4" />
                    {assessment.duration} min
                  </span>
                  <span className={`flex items-center gap-1 ${assessment.isAvailable !== false ? 'text-gray-500' : 'text-gray-400'}`}>
                    <BookOpen className="w-4 h-4" />
                    {assessment.questionCount} questions
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    assessment.isAvailable !== false ? getDifficultyColor(assessment.difficulty) : 'text-gray-400 bg-gray-100'
                  }`}>
                    {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
                  </span>
                  {assessment.popularity && (
                    <span className={`text-xs ${assessment.isAvailable !== false ? 'text-gray-500' : 'text-gray-400'}`}>
                      {assessment.popularity}% popularity
                    </span>
                  )}
                </div>
              </div>

              {/* Domains */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {assessment.domains.slice(0, 2).map((domain, index) => (
                    <span key={index} className={`text-xs px-2 py-1 rounded ${
                      assessment.isAvailable !== false ? 'text-gray-600 bg-gray-100' : 'text-gray-400 bg-gray-50'
                    }`}>
                      {domain.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {assessment.domains.length > 2 && (
                    <span className={`text-xs ${assessment.isAvailable !== false ? 'text-gray-500' : 'text-gray-400'}`}>
                      +{assessment.domains.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {assessment.isAvailable !== false ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(assessment)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={() => handleStartAssessment(assessment.id)}
                      className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 ${getColorClasses(assessment.color)}`}
                    >
                      Start
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/v2/assessment/${assessment.id}/results`)}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Results
                  </button>
                </div>
              ) : (
                <div className="flex">
                  <div className="flex-1 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium text-center cursor-not-allowed">
                    Coming Soon
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getColorClasses(selectedAssessment.color)} bg-opacity-10`}>
                    <div className={`${getColorClasses(selectedAssessment.color).replace('hover:', '')} text-white p-2 rounded`}>
                      {selectedAssessment.icon}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedAssessment.title}</h2>
                    {selectedAssessment.badge && (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full mt-2">
                        <Award className="w-4 h-4" />
                        Earn: {selectedAssessment.badge}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview</h3>
                <p className="text-gray-600">{selectedAssessment.description}</p>
              </div>

              {/* Assessment Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-700 mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Duration</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{selectedAssessment.duration} minutes</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-700 mb-1">
                    <BookOpen className="w-5 h-5" />
                    <span className="font-medium">Questions</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{selectedAssessment.questionCount}</p>
                </div>
              </div>

              {/* Domains Covered */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Domains Covered</h3>
                <div className="space-y-2">
                  {selectedAssessment.domains.map((domain, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{domain.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              {selectedAssessment.prerequisites && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Prerequisites</h3>
                  <div className="space-y-2">
                    {selectedAssessment.prerequisites.map((prereq, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-gray-500 mt-0.5" />
                        <span className="text-gray-700">{prereq}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expected Outcomes */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Expected Outcomes</h3>
                <div className="space-y-2">
                  {selectedAssessment.outcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-gray-700">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics */}
              {(selectedAssessment.popularity || selectedAssessment.completionRate) && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Assessment Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAssessment.popularity && (
                      <div>
                        <p className="text-xs text-blue-700">Popularity</p>
                        <p className="text-lg font-bold text-blue-900">{selectedAssessment.popularity}%</p>
                      </div>
                    )}
                    {selectedAssessment.completionRate && (
                      <div>
                        <p className="text-xs text-blue-700">Completion Rate</p>
                        <p className="text-lg font-bold text-blue-900">{selectedAssessment.completionRate}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                {selectedAssessment.isAvailable !== false ? (
                  <button
                    onClick={() => {
                      handleStartAssessment(selectedAssessment.id);
                      setShowDetails(false);
                    }}
                    className={`flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${getColorClasses(selectedAssessment.color)}`}
                  >
                    Start Assessment
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="flex-1 px-6 py-3 bg-gray-100 text-gray-400 rounded-lg font-medium text-center cursor-not-allowed">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}