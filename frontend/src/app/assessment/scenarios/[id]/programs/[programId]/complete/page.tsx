'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ChevronRight, Download, Share2, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RadarChart } from '@/components/charts/RadarChart';

interface Evaluation {
  id: string;
  score: number;
  feedback: string;
  dimensions: Array<{
    name: string;
    score: number;
    feedback: string;
    metadata?: {
      knowledge?: string[];
      skills?: string[];
      attitudes?: string[];
    };
  }>;
  metadata?: {
    completionTime?: number;
    totalQuestions?: number;
    correctAnswers?: number;
    level?: string;
    recommendations?: string[];
    certificateEligible?: boolean;
    domainScores?: Record<string, number>;
    ksaAnalysis?: {
      knowledge: { score: number; strong: string[]; weak: string[] };
      skills: { score: number; strong: string[]; weak: string[] };
      attitudes: { score: number; strong: string[]; weak: string[] };
    };
  };
}

export default function AssessmentCompletePage({ 
  params 
}: { 
  params: { id: string; programId: string } 
}) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    loadEvaluation();
  }, [params.programId]);

  const loadEvaluation = async () => {
    try {
      const res = await fetch(`/api/assessment/programs/${params.programId}/evaluation`);
      const data = await res.json();
      setEvaluation(data.evaluation);
    } catch (error) {
      console.error('Failed to load evaluation:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-full w-16 mx-auto mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
          <div className="h-40 bg-gray-200 rounded mb-8"></div>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Evaluation not found.</p>
          <Button variant="outline" onClick={() => router.push('/assessment/scenarios')}>
            Back to Assessments
          </Button>
        </Card>
      </div>
    );
  }

  const isPassed = evaluation.score >= 60;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        {isPassed ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Congratulations!</h1>
            <p className="text-gray-600">You've completed the assessment</p>
          </>
        ) : (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Assessment Complete</h1>
            <p className="text-gray-600">Keep learning and try again!</p>
          </>
        )}
      </div>

      {/* Overall Score */}
      <Card className={`mb-8 p-8 text-center border-2 ${getScoreBgColor(evaluation.score)}`}>
        <div className={`text-5xl font-bold mb-2 ${getScoreColor(evaluation.score)}`}>
          {evaluation.score}%
        </div>
        <p className="text-lg text-gray-700 mb-4">{evaluation.feedback}</p>
        {evaluation.metadata?.level && (
          <Badge variant="default" className="text-base px-4 py-1">
            {evaluation.metadata.level.charAt(0).toUpperCase() + evaluation.metadata.level.slice(1)} Level
          </Badge>
        )}
      </Card>

      {/* Quick Stats */}
      {evaluation.metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-600">Questions</p>
            <p className="text-2xl font-bold">
              {evaluation.metadata.correctAnswers}/{evaluation.metadata.totalQuestions}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-600">Accuracy</p>
            <p className="text-2xl font-bold">
              {Math.round((evaluation.metadata.correctAnswers || 0) / (evaluation.metadata.totalQuestions || 1) * 100)}%
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-600">Time Taken</p>
            <p className="text-2xl font-bold">{formatTime(evaluation.metadata.completionTime)}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-2xl font-bold">{isPassed ? 'Passed' : 'Not Passed'}</p>
          </Card>
        </div>
      )}

      {/* Domain Scores */}
      {evaluation.dimensions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Domain Performance</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {evaluation.dimensions.map((dim) => (
                <Card key={dim.name} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{dim.name.replace(/_/g, ' ')}</h3>
                    <span className={`font-bold ${getScoreColor(dim.score)}`}>
                      {dim.score}%
                    </span>
                  </div>
                  <Progress value={dim.score} className="h-2 mb-2" />
                  <p className="text-sm text-gray-600">{dim.feedback}</p>
                </Card>
              ))}
            </div>
            
            {/* Radar Chart */}
            {evaluation.metadata?.domainScores && (
              <Card className="p-4">
                <h3 className="font-medium mb-4 text-center">Skills Overview</h3>
                <RadarChart 
                  data={Object.entries(evaluation.metadata.domainScores).map(([domain, score]) => ({
                    domain: domain.replace(/_/g, ' '),
                    score
                  }))}
                />
              </Card>
            )}
          </div>
        </div>
      )}

      {/* KSA Analysis */}
      {evaluation.metadata?.ksaAnalysis && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Competency Analysis</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(evaluation.metadata.ksaAnalysis).map(([key, data]) => (
              <Card key={key} className="p-4">
                <h3 className="font-medium mb-2 capitalize">{key}</h3>
                <div className="text-2xl font-bold mb-2">{data.score}%</div>
                {data.strong.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-green-600 font-medium">Strong:</p>
                    <p className="text-sm">{data.strong.join(', ')}</p>
                  </div>
                )}
                {data.weak.length > 0 && (
                  <div>
                    <p className="text-sm text-red-600 font-medium">Needs Work:</p>
                    <p className="text-sm">{data.weak.join(', ')}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {evaluation.metadata?.recommendations && evaluation.metadata.recommendations.length > 0 && (
        <Card className="p-6 mb-8">
          <h3 className="font-semibold mb-4">Personalized Recommendations</h3>
          <ul className="space-y-2">
            {evaluation.metadata.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ChevronRight className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          variant="outline"
          onClick={() => router.push(`/assessment/scenarios/${params.id}`)}
        >
          Back to Assessment
        </Button>
        <Button 
          onClick={() => router.push('/pbl/scenarios')}
        >
          Explore Learning Scenarios
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push('/')}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      {/* Certificate Notice */}
      {evaluation.metadata?.certificateEligible && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-blue-800">
            🎉 You're eligible for a certificate! Contact your instructor for more information.
          </p>
        </div>
      )}
    </div>
  );
}