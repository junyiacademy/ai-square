'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileQuestion, Clock, Target, Users, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

interface AssessmentScenario {
  id: string;
  title: string;
  description: string;
  folderName: string;
  config: {
    totalQuestions: number;
    timeLimit: number;
    passingScore: number;
    domains?: string[];
  };
  userProgress?: {
    completedPrograms: number;
    lastAttempt?: Date;
    bestScore?: number;
  };
}

// Client-side cache
const scenariosCache: Record<string, {
  data: AssessmentScenario[];
  timestamp: number;
}> = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function AssessmentScenariosPage() {
  const [scenarios, setScenarios] = useState<AssessmentScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t, i18n } = useTranslation(['assessment', 'common']);
  const loadingRef = useRef(false);

  const loadAssessmentScenarios = useCallback(async () => {
    const cacheKey = i18n.language;
    const now = Date.now();
    
    // Check client-side cache
    if (scenariosCache[cacheKey] && (now - scenariosCache[cacheKey].timestamp) < CACHE_TTL) {
      console.log('Using cached scenarios');
      setScenarios(scenariosCache[cacheKey].data);
      setLoading(false);
      return;
    }
    
    // Prevent concurrent requests
    if (loadingRef.current) {
      console.log('Already loading scenarios, skipping...');
      return;
    }
    
    loadingRef.current = true;
    try {
      const res = await authenticatedFetch(`/api/assessment/scenarios?lang=${i18n.language}`);
      const data = await res.json();
      const loadedScenarios = data.data?.scenarios || [];
      
      // Update cache
      scenariosCache[cacheKey] = {
        data: loadedScenarios,
        timestamp: now
      };
      
      setScenarios(loadedScenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
      setScenarios([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [i18n.language]);

  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (!loadingRef.current) {
      loadAssessmentScenarios();
    }
  }, [loadAssessmentScenarios]);


  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-gray-900">{t('common:home')}</Link>
          <span>/</span>
          <span>{t('assessment:title')}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('assessment:title')}</h1>
        <p className="text-gray-600">{t('assessment:description')}</p>
      </div>

      {scenarios.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">{t('assessment:noAssessmentsAvailable', 'No assessments available at the moment.')}</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            {t('common:backToHome', 'Back to Home')}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <Card 
              key={scenario.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileQuestion className="h-8 w-8 text-blue-500" />
                  {scenario.userProgress?.bestScore !== undefined && (
                    <div className="text-sm text-green-600 font-semibold">
                      {t('assessment:best', 'Best')}: {scenario.userProgress.bestScore}%
                    </div>
                  )}
                </div>
                <CardTitle className="mt-4">{scenario.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {scenario.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Target className="h-4 w-4" />
                    <span>{scenario.config.totalQuestions} {t('assessment:questions', 'questions')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{scenario.config.timeLimit} {t('assessment:minutes', 'minutes')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{t('assessment:pass', 'Pass')}: {scenario.config.passingScore}%</span>
                  </div>
                </div>
                
                {scenario.userProgress && scenario.userProgress.completedPrograms > 0 && (
                  <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>{scenario.userProgress.completedPrograms} {t('assessment:attempts', 'attempts')}</span>
                      {scenario.userProgress.lastAttempt && (
                        <span>
                          {t('assessment:last', 'Last')}: {new Date(scenario.userProgress.lastAttempt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => router.push(`/assessment/scenarios/${scenario.id}`)}
                  >
                    {t('assessment:viewDetails', 'View Details')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}