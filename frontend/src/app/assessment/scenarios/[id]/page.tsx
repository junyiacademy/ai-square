'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileQuestion, Clock, Target, ChevronLeft, Play, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
// Remove date-fns import - will use custom formatting

interface AssessmentScenario {
  id: string;
  title: string;
  description: string;
  config: {
    totalQuestions: number;
    timeLimit: number;
    passingScore: number;
    domains?: string[];
  };
}

interface Program {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'abandoned';
  score?: number;
  currentTaskIndex: number;
  metadata?: {
    timeSpent?: number;
    questionsAnswered?: number;
    totalQuestions?: number;
    correctAnswers?: number;
    level?: string;
    domainScores?: Record<string, number>;
  };
}

export default function AssessmentScenarioDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const [scenario, setScenario] = useState<AssessmentScenario | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingProgram, setStartingProgram] = useState(false);
  const [scenarioId, setScenarioId] = useState<string>('');
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    // Unwrap the params Promise
    params.then(p => {
      setScenarioId(p.id);
      loadScenarioAndPrograms(p.id);
    });
  }, [params, i18n.language]);

  const loadScenarioAndPrograms = async (id: string) => {
    try {
      // Load scenario details
      const scenarioRes = await fetch(`/api/assessment/scenarios/${id}?lang=${i18n.language}`, {
        credentials: 'include' // Include cookies for authentication
      });
      const scenarioData = await scenarioRes.json();
      setScenario(scenarioData);

      // Load user's programs
      try {
        const programsRes = await fetch(`/api/assessment/scenarios/${id}/programs`, {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (programsRes.ok) {
          const programsData = await programsRes.json();
          setPrograms(programsData.programs || []);
        } else if (programsRes.status === 401) {
          // User not authenticated, that's ok - they can still view the scenario
          setPrograms([]);
        }
      } catch (error) {
        // Silently handle programs loading error
        console.error('Error loading programs:', error);
        setPrograms([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewProgram = async () => {
    // Prevent double-clicking
    if (startingProgram) {
      console.log('Already starting a program, ignoring click');
      return;
    }
    
    setStartingProgram(true);
    try {
      if (!isLoggedIn || !user) {
        // Redirect to login if not authenticated
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
        setStartingProgram(false);
        return;
      }
      
      const res = await fetch(`/api/assessment/scenarios/${scenarioId}/programs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          action: 'start',
          language: i18n.language
        })
      });
      
      if (res.status === 401) {
        // Redirect to login if still not authenticated
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }
      
      if (!res.ok) {
        throw new Error('Failed to start program');
      }
      
      const { program } = await res.json();
      router.push(`/assessment/scenarios/${scenarioId}/programs/${program.id}`);
    } catch (error) {
      console.error('Failed to start program:', error);
      setStartingProgram(false);
    }
  };

  const continueProgram = (programId: string) => {
    router.push(`/assessment/scenarios/${scenarioId}/programs/${programId}`);
  };

  const viewResults = (programId: string) => {
    router.push(`/assessment/scenarios/${scenarioId}/programs/${programId}/complete`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-8"></div>
          <div className="h-40 bg-gray-200 rounded mb-8"></div>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Assessment not found.</p>
          <Button variant="outline" onClick={() => router.push('/assessment/scenarios')}>
            Back to Assessments
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Navigation */}
      <div className="mb-8">
        <Link 
          href="/assessment/scenarios" 
          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Assessments
        </Link>
        
        <h1 className="text-3xl font-bold mb-4">{scenario.title}</h1>
        <p className="text-gray-600 mb-6">{scenario.description}</p>
        
        {/* Assessment Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Assessment Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-600 text-sm block">Questions</span>
              <span className="font-medium">{scenario.config.totalQuestions}</span>
            </div>
            <div>
              <span className="text-gray-600 text-sm block">Time Limit</span>
              <span className="font-medium">{scenario.config.timeLimit} minutes</span>
            </div>
            <div>
              <span className="text-gray-600 text-sm block">Passing Score</span>
              <span className="font-medium">{scenario.config.passingScore}%</span>
            </div>
            <div>
              <span className="text-gray-600 text-sm block">Domains</span>
              <span className="font-medium">
                {scenario.config.domains?.length || 4} domains
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Programs Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Your Attempts</h2>
          <Button 
            onClick={startNewProgram} 
            size="lg"
            disabled={startingProgram}
          >
            {startingProgram ? (
              <>Starting...</>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start New Assessment
              </>
            )}
          </Button>
        </div>

        {programs.length === 0 ? (
          <Card className="p-8 text-center">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">You haven't taken this assessment yet.</p>
            <Button onClick={startNewProgram} disabled={startingProgram}>
              Take Your First Assessment
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {programs.map((program) => (
              <Card key={program.id} className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-600">
                        Started {new Date(program.startedAt).toLocaleDateString()}
                      </span>
                      {program.status === 'completed' && (
                        <Badge variant="default" className="bg-green-600">Completed</Badge>
                      )}
                      {program.status === 'active' && (
                        <Badge variant="secondary" className="bg-yellow-600 text-white">In Progress</Badge>
                      )}
                      {program.status === 'abandoned' && (
                        <Badge variant="secondary">Abandoned</Badge>
                      )}
                    </div>
                    
                    {program.score !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-green-600">
                            {program.score}%
                          </span>
                          {program.score >= scenario.config.passingScore ? (
                            <span className="text-sm text-green-600">Passed</span>
                          ) : (
                            <span className="text-sm text-red-600">Not Passed</span>
                          )}
                          {program.metadata?.level && (
                            <Badge variant="outline" className="ml-2">
                              {program.metadata.level}
                            </Badge>
                          )}
                        </div>
                        {program.metadata?.correctAnswers !== undefined && (
                          <p className="text-sm text-gray-600">
                            {program.metadata.correctAnswers} of {program.metadata.totalQuestions} correct
                            {program.metadata.timeSpent && (
                              <span> • {Math.floor(program.metadata.timeSpent / 60)} minutes</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {program.status === 'active' && program.metadata?.questionsAnswered && (
                      <p className="text-sm text-gray-600 mt-1">
                        Progress: {program.metadata.questionsAnswered} of {scenario.config.totalQuestions} questions
                      </p>
                    )}
                  </div>
                  
                  <div>
                    {program.status === 'completed' ? (
                      <Button 
                        variant="outline"
                        onClick={() => viewResults(program.id)}
                      >
                        View Results
                      </Button>
                    ) : program.status === 'active' ? (
                      <Button onClick={() => continueProgram(program.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Continue
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}