#!/usr/bin/env npx tsx

/**
 * Minimal test to check evaluation data flow
 */

// Mock evaluation data that should come from AI
const mockEvaluation = {
  score: 15,
  ksaScores: {
    knowledge: 0,
    skills: 0,
    attitudes: 15
  },
  domainScores: {
    engaging_with_ai: 0,
    creating_with_ai: 0,
    managing_with_ai: 0,
    designing_with_ai: 0
  },
  rubricsScores: {
    "Research Quality": 1,
    "AI Utilization": 1,
    "Content Quality": 1,
    "Learning Progress": 1
  },
  conversationInsights: {
    effectiveExamples: [],
    improvementAreas: []
  },
  strengths: ["Started interaction"],
  improvements: ["Engage more meaningfully"],
  nextSteps: ["Ask specific questions"],
  evaluatedAt: new Date().toISOString(),
  conversationCount: 1
};

console.log('📊 Mock Evaluation Data:');
console.log(JSON.stringify(mockEvaluation, null, 2));

// Test the createEvaluationData function logic
const createEvaluationData = (evaluation: Record<string, unknown>) => ({
  userId: 'test-user-id',
  programId: 'test-program-id',
  taskId: 'test-task-id',
  mode: 'pbl' as const,
  evaluationType: 'task',
  evaluationSubtype: 'pbl_task',
  score: (evaluation.score as number) || 0,
  maxScore: 100,
  timeTakenSeconds: 0,
  domainScores: (evaluation.domainScores as Record<string, number>) || {},
  feedbackText: '',
  feedbackData: {
    strengths: (evaluation.strengths as string[]) || [],
    improvements: (evaluation.improvements as string[]) || [],
    nextSteps: (evaluation.nextSteps as string[]) || []
  },
  aiAnalysis: (evaluation.conversationInsights as Record<string, unknown>) || {},
  createdAt: new Date().toISOString(),
  pblData: {
    ksaScores: (evaluation.ksaScores as Record<string, number>) || {},
    rubricsScores: (evaluation.rubricsScores as Record<string, number>) || {},
    conversationCount: (evaluation.conversationCount as number) || 0
  },
  discoveryData: {},
  assessmentData: {},
  metadata: {
    programId: 'test-program-id',
    evaluatedAt: evaluation.evaluatedAt || new Date().toISOString()
  }
});

console.log('\n📦 Transformed for Database:');
const dbData = createEvaluationData(mockEvaluation);
console.log('domainScores:', JSON.stringify(dbData.domainScores, null, 2));
console.log('pblData.ksaScores:', JSON.stringify(dbData.pblData.ksaScores, null, 2));

// Check if domain scores would be saved
if (Object.keys(dbData.domainScores).length === 0) {
  console.log('\n❌ ERROR: Domain scores would be empty in database!');
} else {
  console.log('\n✅ Domain scores would be saved correctly');
}