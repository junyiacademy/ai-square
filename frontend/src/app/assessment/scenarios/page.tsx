'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileQuestion, Clock, Target, Users, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export default function AssessmentScenariosPage() {
  const [scenarios, setScenarios] = useState<AssessmentScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    loadAssessmentScenarios();
  }, [i18n.language]);

  const loadAssessmentScenarios = async () => {
    try {
      const res = await fetch(`/api/assessment/scenarios?lang=${i18n.language}`);
      const data = await res.json();
      setScenarios(data.scenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <Link href="/" className="hover:text-gray-900">Home</Link>
          <span>/</span>
          <span>Assessments</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">AI Literacy Assessments</h1>
        <p className="text-gray-600">Choose an assessment to evaluate your AI literacy skills</p>
      </div>

      {scenarios.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">No assessments available at the moment.</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <Card 
              key={scenario.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/assessment/scenarios/${scenario.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileQuestion className="h-8 w-8 text-blue-500" />
                  {scenario.userProgress?.bestScore !== undefined && (
                    <div className="text-sm text-green-600 font-semibold">
                      Best: {scenario.userProgress.bestScore}%
                    </div>
                  )}
                </div>
                <CardTitle className="mt-4">{scenario.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {scenario.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>{scenario.config.totalQuestions} questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{scenario.config.timeLimit} minutes</span>
                  </div>
                  {scenario.userProgress && scenario.userProgress.completedPrograms > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{scenario.userProgress.completedPrograms} attempts</span>
                    </div>
                  )}
                </div>
                
                <Button className="w-full mt-4" variant="outline">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}