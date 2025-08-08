'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import type { AssessmentResult } from '@/types/assessment';
import type { Scenario, ScenarioListItem } from '@/types/pbl';

interface LearningPathItem {
  id: string;
  type: 'pbl_scenario' | 'reading' | 'practice';
  priority: 'high' | 'medium' | 'low';
  domain: string;
  title: string;
  description: string;
  estimatedTime: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  reason: string;
  scenarioId?: string;
  completed?: boolean;
  progress?: number;
}

interface DomainProgress {
  domain: string;
  currentScore: number;
  targetScore: number;
  completedItems: number;
  totalItems: number;
}

interface UserProfile {
  identity?: string;
  interests?: string[];
}

interface ScenarioWithDomains extends Scenario {
  domains?: string[];
  targetDomain?: string[];
  skills?: string[];
  topics?: string[];
  relevanceScore?: number;
  matchedKeywords?: string[];
  taskCount: number; // Required by ScenarioListItem
}

// Role-based keyword patterns for relevance matching
const roleKeywordPatterns: { [key: string]: RegExp } = {
  student: /\b(school|study|homework|exam|learn|assignment|student)\w*/i,
  teacher: /\b(educat|teach|instruct|curriculum|classroom|pedagog)\w*/i,
  professional: /\b(business|career|job|work|productivity|manage|professional)\w*/i,
  learner: /\b(learn|skill|develop|improve|knowledge)\w*/i
};

function LearningPathContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation(['learningPath', 'common', 'assessment']);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [filterMode, setFilterMode] = useState<'all' | 'weak'>('all');

  useEffect(() => {
    // Check URL parameter for filter mode
    const filter = searchParams.get('filter');
    if (filter === 'weak') {
      setFilterMode('weak');
    }

    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    // Get user profile (identity and interests)
    const profileStr = localStorage.getItem('userProfile');
    if (profileStr) {
      setUserProfile(JSON.parse(profileStr));
    }

    // Get assessment result
    const resultStr = localStorage.getItem('assessmentResult');
    if (!resultStr) {
      // No assessment result, redirect to assessment
      router.push('/assessment');
      return;
    }

    const result = JSON.parse(resultStr) as AssessmentResult;
    setAssessmentResult(result);

    // Generate learning path based on assessment
    generateLearningPath(result);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  // Generate personalized recommendation reason
  const generatePersonalizedReason = (
    scenario: ScenarioListItem | ScenarioWithDomains, 
    domain: string, 
    domainScore: number,
    matchedKeywords: string[]
  ): string => {
    const domainName = domain.replace(/_/g, ' ');
    const reasons: string[] = [];
    
    // 1. Assessment-based reason
    if (domainScore < 60) {
      reasons.push(`Strengthen your ${domainName} skills (current: ${domainScore}%)`);
    } else if (domainScore >= 80) {
      reasons.push(`Advance your ${domainName} expertise (current: ${domainScore}%)`);
    } else {
      reasons.push(`Improve your ${domainName} competency (current: ${domainScore}%)`);
    }
    
    // 2. Role-based reason
    if (userProfile.identity && matchedKeywords.length > 0) {
      const roleReasons: { [key: string]: string } = {
        teacher: `Perfect for educators - covers ${matchedKeywords.slice(0, 2).join(' & ')}`,
        student: `Ideal for students - focuses on ${matchedKeywords.slice(0, 2).join(' & ')}`,
        professional: `Relevant for professionals - includes ${matchedKeywords.slice(0, 2).join(' & ')}`,
        learner: `Great for continuous learners - explores ${matchedKeywords.slice(0, 2).join(' & ')}`
      };
      
      if (roleReasons[userProfile.identity]) {
        reasons.push(roleReasons[userProfile.identity]);
      }
    }
    
    // 3. Interest-based reason (if we have interests)
    if (userProfile.interests && userProfile.interests.length > 0) {
      const scenarioText = `${scenario.title} ${scenario.description}`.toLowerCase();
      const matchedInterests = userProfile.interests.filter((interest: string) => 
        scenarioText.includes(interest.toLowerCase())
      );
      
      if (matchedInterests.length > 0) {
        reasons.push(`Aligns with your interests in ${matchedInterests.join(' & ')}`);
      }
    }
    
    // 4. Scenario-specific value proposition
    const scenarioTitle = typeof scenario.title === 'string' 
      ? scenario.title 
      : typeof scenario.title === 'object' && scenario.title 
        ? ((scenario.title as Record<string, string>).en || (scenario.title as Record<string, string>).zh || '')
        : '';
    if (scenarioTitle.toLowerCase().includes('job') && userProfile.identity === 'professional') {
      reasons.push('Directly applicable to your career development');
    } else if (scenarioTitle.toLowerCase().includes('educat') && userProfile.identity === 'teacher') {
      reasons.push('Enhance your teaching with AI tools');
    }
    
    return reasons.join(' • ');
  };

  // Calculate relevance score based on user identity
  const calculateRelevanceScore = (scenario: ScenarioListItem & { matchedKeywords?: string[] }): { score: number; matchedKeywords: string[] } => {
    if (!userProfile.identity) return { score: 0, matchedKeywords: [] };
    
    const pattern = roleKeywordPatterns[userProfile.identity];
    if (!pattern) return { score: 0, matchedKeywords: [] };
    
    const text = `${scenario.title || ''} ${scenario.description || ''}`;
    const matches = text.match(pattern);
    
    // Each match adds 10 points, title matches worth double
    let score = 0;
    const matchedKeywords: string[] = [];
    
    if (matches) {
      score = matches.length * 10;
      // Get unique matched keywords
      matches.forEach((match: string) => {
        const keyword = match.toLowerCase();
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      });
    }
    
    // Title matches are worth more
    const titleMatches = (scenario.title || '').match(pattern);
    if (titleMatches) {
      score += titleMatches.length * 10;
    }
    
    return { 
      score: Math.min(score, 50), // Cap at 50 to not overwhelm assessment score
      matchedKeywords
    };
  };

  const generateLearningPath = async (result: AssessmentResult) => {
    try {
      // Fetch PBL scenarios
      const response = await fetch('/api/pbl/scenarios');
      const scenariosData = await response.json();
      
      // Handle the nested data structure
      const scenarios = scenariosData.data?.scenarios || scenariosData.scenarios || [];
      
      // Ensure scenarios is an array
      if (!Array.isArray(scenarios)) {
        console.error('Scenarios is not an array:', scenarios);
        setLearningPath([]);
        setDomainProgress([]);
        return;
      }

      const path: LearningPathItem[] = [];
      const progress: DomainProgress[] = [];

      // Analyze each domain
      Object.entries(result.domainScores).forEach(([domain, score]) => {
        const domainKey = domain.replace('_', ' ');
        const isWeak = score < 60;
        const isStrong = score >= 80;

        // Filter scenarios for this domain
        const domainScenarios = (scenarios as ScenarioWithDomains[]).filter((s) => 
          s.domains?.includes(domain) || s.domains?.includes(domainKey) ||
          s.targetDomain?.includes(domain) || s.targetDomain?.includes(domainKey)
        );

        // Add domain progress
        const domainItems: LearningPathItem[] = [];

        if (isWeak) {
          // For weak domains, recommend beginner scenarios
          let beginnerScenarios = domainScenarios.filter((s) => 
            s.difficulty === 'beginner' || s.difficulty === 'intermediate'
          );

          // Sort by relevance score if user has identity
          if (userProfile.identity) {
            beginnerScenarios = beginnerScenarios.map((s) => ({
              ...s,
              ...calculateRelevanceScore(s),
              relevanceScore: calculateRelevanceScore(s).score
            })).sort((a, b) => b.relevanceScore - a.relevanceScore);
          }

          beginnerScenarios.slice(0, 3).forEach((scenario: ScenarioListItem & { matchedKeywords?: string[] }, idx: number) => {
            const matchedKeywords = scenario.matchedKeywords || [];
            const reason = generatePersonalizedReason(scenario, domain, score, matchedKeywords);

            const item: LearningPathItem = {
              id: `pbl-${domain}-${scenario.id}-${idx}`,
              type: 'pbl_scenario',
              priority: 'high',
              domain,
              title: typeof scenario.title === 'string' 
                ? scenario.title 
                : typeof scenario.title === 'object' && scenario.title
                  ? ((scenario.title as Record<string, string>).en || (scenario.title as Record<string, string>).zh || '')
                  : '',
              description: typeof scenario.description === 'string'
                ? scenario.description
                : typeof scenario.description === 'object' && scenario.description
                  ? ((scenario.description as Record<string, string>).en || (scenario.description as Record<string, string>).zh || '')
                  : '',
              estimatedTime: scenario.estimatedDuration || 30,
              difficulty: scenario.difficulty,
              reason,
              scenarioId: scenario.id,
              completed: false,
              progress: 0
            };
            domainItems.push(item);
            path.push(item);
          });
        } else if (isStrong) {
          // For strong domains, recommend advanced scenarios
          let advancedScenarios = domainScenarios.filter((s) => 
            s.difficulty === 'advanced' || s.difficulty === 'intermediate'
          );

          // Sort by relevance score if user has identity
          if (userProfile.identity) {
            advancedScenarios = advancedScenarios.map((s) => ({
              ...s,
              ...calculateRelevanceScore(s),
              relevanceScore: calculateRelevanceScore(s).score
            })).sort((a, b) => b.relevanceScore - a.relevanceScore);
          }

          advancedScenarios.slice(0, 1).forEach((scenario, idx) => {
            const matchedKeywords = scenario.matchedKeywords || [];
            const reason = generatePersonalizedReason(scenario, domain, score, matchedKeywords);

            const item: LearningPathItem = {
              id: `pbl-${domain}-${scenario.id}-${idx}`,
              type: 'pbl_scenario',
              priority: 'medium',
              domain,
              title: typeof scenario.title === 'string' 
                ? scenario.title 
                : typeof scenario.title === 'object' && scenario.title
                  ? ((scenario.title as Record<string, string>).en || (scenario.title as Record<string, string>).zh || '')
                  : '',
              description: typeof scenario.description === 'string'
                ? scenario.description
                : typeof scenario.description === 'object' && scenario.description
                  ? ((scenario.description as Record<string, string>).en || (scenario.description as Record<string, string>).zh || '')
                  : '',
              estimatedTime: scenario.estimatedDuration || 45,
              difficulty: scenario.difficulty,
              reason,
              scenarioId: scenario.id,
              completed: false,
              progress: 0
            };
            domainItems.push(item);
            path.push(item);
          });
        } else {
          // For average domains, recommend intermediate scenarios
          let intermediateScenarios = domainScenarios.filter((s) => 
            s.difficulty === 'intermediate'
          );

          // Sort by relevance score if user has identity
          if (userProfile.identity) {
            intermediateScenarios = intermediateScenarios.map((s) => ({
              ...s,
              ...calculateRelevanceScore(s),
              relevanceScore: calculateRelevanceScore(s).score
            })).sort((a, b) => b.relevanceScore - a.relevanceScore);
          }

          intermediateScenarios.slice(0, 2).forEach((scenario, idx) => {
            const matchedKeywords = scenario.matchedKeywords || [];
            const reason = generatePersonalizedReason(scenario, domain, score, matchedKeywords);

            const item: LearningPathItem = {
              id: `pbl-${domain}-${scenario.id}-${idx}`,
              type: 'pbl_scenario',
              priority: 'medium',
              domain,
              title: typeof scenario.title === 'string' 
                ? scenario.title 
                : typeof scenario.title === 'object' && scenario.title
                  ? ((scenario.title as Record<string, string>).en || (scenario.title as Record<string, string>).zh || '')
                  : '',
              description: typeof scenario.description === 'string'
                ? scenario.description
                : typeof scenario.description === 'object' && scenario.description
                  ? ((scenario.description as Record<string, string>).en || (scenario.description as Record<string, string>).zh || '')
                  : '',
              estimatedTime: scenario.estimatedDuration || 30,
              difficulty: scenario.difficulty,
              reason,
              scenarioId: scenario.id,
              completed: false,
              progress: 0
            };
            domainItems.push(item);
            path.push(item);
          });
        }

        progress.push({
          domain,
          currentScore: score,
          targetScore: Math.min(score + 20, 100),
          completedItems: 0,
          totalItems: domainItems.length
        });
      });

      // Sort path by priority
      path.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setLearningPath(path);
      setDomainProgress(progress);
    } catch (error) {
      console.error('Error generating learning path:', error);
    }
  };

  const getDomainName = (domainKey: string) => {
    return t(`assessment:domains.${domainKey}`);
  };

  const getDomainColor = (domain: string) => {
    const colors: { [key: string]: string } = {
      engaging_with_ai: 'from-blue-500 to-blue-600',
      creating_with_ai: 'from-purple-500 to-purple-600',
      managing_with_ai: 'from-green-500 to-green-600',
      designing_with_ai: 'from-orange-500 to-orange-600'
    };
    return colors[domain] || 'from-gray-500 to-gray-600';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⭐';
      case 'low': return '📌';
      default: return '📌';
    }
  };

  // Apply filters
  let filteredPath = learningPath;
  
  // Filter by weak areas if mode is set
  if (filterMode === 'weak' && assessmentResult) {
    const weakDomains = Object.entries(assessmentResult.domainScores)
      .filter(([, score]) => score < 60)
      .map(([domain]) => domain);
    
    filteredPath = filteredPath.filter(item => weakDomains.includes(item.domain));
  }
  
  // Filter by selected domain
  if (selectedDomain) {
    filteredPath = filteredPath.filter(item => item.domain === selectedDomain);
  }

  const totalEstimatedTime = filteredPath.reduce((sum, item) => sum + item.estimatedTime, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('learningPath:title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('learningPath:subtitle')}
          </p>
        </div>

        {/* Profile Reminder Card */}
        {!userProfile.identity && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💡</span>
              <div className="flex-1">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  Complete your profile for better recommendations!
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                  We can provide more personalized learning paths if you tell us about your identity and interests. 
                  Update your profile in the settings to get recommendations tailored to your role.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('learningPath:showAll')}
            </button>
            <button
              onClick={() => setFilterMode('weak')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'weak'
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              🎯 {t('learningPath:focusOnWeakAreas')}
            </button>
          </div>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('learningPath:backToDashboard')}
          </Link>
        </div>

        {/* Overall Progress Card */}
        {assessmentResult && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('learningPath:yourProgress')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {domainProgress.map((progress) => (
                <div 
                  key={progress.domain} 
                  className="cursor-pointer"
                  onClick={() => setSelectedDomain(
                    selectedDomain === progress.domain ? null : progress.domain
                  )}
                >
                  <div className={`p-6 rounded-xl bg-gradient-to-br ${getDomainColor(progress.domain)} ${
                    selectedDomain === progress.domain ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : ''
                  } transform transition-all duration-200 hover:scale-105 shadow-lg`}>
                    <h3 className="text-white font-semibold text-lg mb-4">
                      {getDomainName(progress.domain)}
                    </h3>
                    
                    {/* Score Display */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm">{t('learningPath:currentScore')}</span>
                        <span className="text-white font-bold text-xl">{progress.currentScore}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm">{t('learningPath:targetScore')}</span>
                        <span className="text-white/90 font-semibold">{progress.targetScore}%</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="bg-white/20 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-white rounded-full h-3 transition-all duration-500 ease-out"
                          style={{ width: `${(progress.completedItems / progress.totalItems) * 100 || 0}%` }}
                        />
                      </div>
                      <p className="text-sm text-white/90 text-center">
                        {progress.completedItems}/{progress.totalItems} {t('learningPath:completed')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Info */}
        {selectedDomain && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400">
              {t('learningPath:learningPath.filteringBy', { domain: getDomainName(selectedDomain) })}
            </p>
            <button
              onClick={() => setSelectedDomain(null)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('learningPath:learningPath.clearFilter')}
            </button>
          </div>
        )}

        {/* Learning Path Items */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('learningPath:learningPath.recommendedPath')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('learningPath:learningPath.estimatedTime', { 
                hours: Math.floor(totalEstimatedTime / 60),
                minutes: totalEstimatedTime % 60
              })}
            </p>
          </div>

          {filteredPath.map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{getPriorityIcon(item.priority)}</span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getDifficultyColor(item.difficulty)}`}>
                        {t(`common:difficulty.${item.difficulty}`)}
                      </span>
                      {/* Show badge if personalized for user's role */}
                      {userProfile.identity && (item.reason.includes('Perfect for') || 
                        item.reason.includes('Ideal for') || 
                        item.reason.includes('Relevant for') ||
                        item.reason.includes('Great for')) && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          🎯 For {userProfile.identity}s
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{item.estimatedTime} {t('common:minutes')}</span>
                      <span className="mx-2">•</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {getDomainName(item.domain)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {item.type === 'pbl_scenario' && item.scenarioId && (
                      <Link
                        href={`/pbl/scenarios/${item.scenarioId}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('learningPath:learningPath.startLearning')}
                        <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {item.progress !== undefined && item.progress > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>{t('learningPath:learningPath.progress')}</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-12 text-center space-y-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {t('learningPath:learningPath.goToDashboard')}
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-gray-600 dark:text-gray-400">
            {t('learningPath:learningPath.dashboardHint')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LearningPathPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LearningPathContent />
    </Suspense>
  );
}