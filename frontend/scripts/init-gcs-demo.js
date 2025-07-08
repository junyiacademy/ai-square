#!/usr/bin/env node
/**
 * Initialize GCS with demo data for V2 architecture
 * Usage: node scripts/init-gcs-demo.js [--clear]
 */

const { Storage } = require('@google-cloud/storage');

// Configuration
const BUCKET_NAME = process.env.GCS_BUCKET_NAME_V2 || 'ai-square-db-v2';
const DEMO_USER_EMAIL = 'demo@example.com';

// Initialize GCS
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

// Demo data - Assessment focused with proper SCENARIO → PROGRAM → TASK → LOG structure
const demoAssessmentData = {
  // User history
  [`v2/user-history/${DEMO_USER_EMAIL}.json`]: {
    userEmail: DEMO_USER_EMAIL,
    assessments: [
      {
        id: 'assessment_1736329200000',
        scenarioId: 'scenario_assessment_001',
        programId: 'program_assessment_001_attempt3',
        completedAt: '2025-01-08T10:00:00Z',
        score: 85,
        passed: true,
        certificateId: 'cert_1736329200000',
        attemptNumber: 3,
        programType: 'formal'
      },
      {
        id: 'assessment_1736242800000',
        scenarioId: 'scenario_assessment_001',
        programId: 'program_assessment_001_attempt2',
        completedAt: '2025-01-07T10:00:00Z',
        score: 72,
        passed: true,
        certificateId: null,
        attemptNumber: 2,
        programType: 'practice'
      },
      {
        id: 'assessment_1736156400000',
        scenarioId: 'scenario_assessment_001',
        programId: 'program_assessment_001_attempt1',
        completedAt: '2025-01-06T10:00:00Z',
        score: 65,
        passed: true,
        certificateId: null,
        attemptNumber: 1,
        programType: 'practice'
      }
    ],
    stats: {
      totalAssessments: 3,
      averageScore: 74,
      bestScore: 85,
      lastAssessmentDate: '2025-01-08T10:00:00Z',
      certificatesEarned: 1,
      domainProgress: {
        engaging_with_ai: { averageScore: 80, assessmentCount: 3, trend: 'improving' },
        creating_with_ai: { averageScore: 70, assessmentCount: 3, trend: 'stable' },
        managing_with_ai: { averageScore: 75, assessmentCount: 3, trend: 'improving' },
        designing_with_ai: { averageScore: 71, assessmentCount: 3, trend: 'stable' }
      },
      ksaProgress: {
        knowledge: 78,
        skills: 72,
        attitudes: 82
      }
    },
    createdAt: '2025-01-06T09:00:00Z',
    updatedAt: '2025-01-08T10:00:00Z'
  },

  // Assessment Session 1 - Excellent Performance
  [`v2/assessments/${DEMO_USER_EMAIL}/assessment_1736329200000.json`]: {
    id: 'assessment_1736329200000',
    userEmail: DEMO_USER_EMAIL,
    sessionType: 'comprehensive',
    startedAt: '2025-01-08T09:30:00Z',
    completedAt: '2025-01-08T10:00:00Z',
    status: 'completed',
    config: {
      totalQuestions: 12,
      timeLimit: 15,
      passingScore: 60,
      domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
      language: 'en'
    },
    responses: Array(12).fill(null).map((_, i) => ({
      questionId: `Q${String(i + 1).padStart(3, '0')}`,
      answer: ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)],
      timeSpent: 30 + Math.floor(Math.random() * 60),
      timestamp: new Date(Date.now() - (12 - i) * 60000).toISOString()
    })),
    results: {
      overallScore: 85,
      correctAnswers: 10,
      totalQuestions: 12,
      timeSpent: 600,
      performance: 'excellent',
      passed: true,
      domainScores: {
        engaging_with_ai: 100,
        creating_with_ai: 67,
        managing_with_ai: 100,
        designing_with_ai: 67
      },
      ksaScores: {
        knowledge: 82,
        skills: 78,
        attitudes: 85
      },
      ksaDemonstrated: {
        knowledge: [
          { code: 'K001', name: 'AI Fundamentals', mastery: 2, correct: 3, total: 3, tasks: ['Q001', 'Q002', 'Q003'] },
          { code: 'K002', name: 'AI Applications', mastery: 1, correct: 2, total: 3, tasks: ['Q004', 'Q005', 'Q006'] },
          { code: 'K003', name: 'AI Ethics', mastery: 2, correct: 3, total: 3, tasks: ['Q007', 'Q008', 'Q009'] }
        ],
        skills: [
          { code: 'S001', name: 'Prompt Engineering', mastery: 2, correct: 2, total: 2, tasks: ['Q001', 'Q004'] },
          { code: 'S002', name: 'AI Tool Selection', mastery: 1, correct: 2, total: 3, tasks: ['Q002', 'Q005', 'Q008'] },
          { code: 'S003', name: 'AI Output Evaluation', mastery: 2, correct: 3, total: 3, tasks: ['Q003', 'Q006', 'Q009'] }
        ],
        attitudes: [
          { code: 'A001', name: 'Critical Thinking', mastery: 2, correct: 3, total: 3, tasks: ['Q010', 'Q011', 'Q012'] },
          { code: 'A002', name: 'Ethical Consideration', mastery: 2, correct: 3, total: 3, tasks: ['Q007', 'Q008', 'Q009'] },
          { code: 'A003', name: 'Continuous Learning', mastery: 2, correct: 2, total: 2, tasks: ['Q011', 'Q012'] }
        ]
      },
      certificate: {
        id: 'cert_1736329200000',
        issuedAt: '2025-01-08T10:00:00Z',
        expiresAt: '2026-01-08T10:00:00Z',
        verificationCode: 'ABCD-EFGH-IJKL'
      }
    },
    createdAt: '2025-01-08T09:30:00Z',
    updatedAt: '2025-01-08T10:00:00Z'
  },

  // Assessment Session 2 - Good Performance
  [`v2/assessments/${DEMO_USER_EMAIL}/assessment_1736242800000.json`]: {
    id: 'assessment_1736242800000',
    userEmail: DEMO_USER_EMAIL,
    sessionType: 'comprehensive',
    startedAt: '2025-01-07T09:30:00Z',
    completedAt: '2025-01-07T10:00:00Z',
    status: 'completed',
    config: {
      totalQuestions: 12,
      timeLimit: 15,
      passingScore: 60,
      domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
      language: 'en'
    },
    responses: Array(12).fill(null).map((_, i) => ({
      questionId: `Q${String(i + 1).padStart(3, '0')}`,
      answer: ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)],
      timeSpent: 35 + Math.floor(Math.random() * 65),
      timestamp: new Date(Date.now() - 86400000 - (12 - i) * 60000).toISOString()
    })),
    results: {
      overallScore: 72,
      correctAnswers: 8,
      totalQuestions: 12,
      timeSpent: 615,
      performance: 'good',
      passed: true,
      domainScores: {
        engaging_with_ai: 67,
        creating_with_ai: 67,
        managing_with_ai: 67,
        designing_with_ai: 100
      },
      ksaScores: {
        knowledge: 75,
        skills: 70,
        attitudes: 80
      }
    },
    createdAt: '2025-01-07T09:30:00Z',
    updatedAt: '2025-01-07T10:00:00Z'
  },

  // Assessment Session 3 - Satisfactory Performance
  [`v2/assessments/${DEMO_USER_EMAIL}/assessment_1736156400000.json`]: {
    id: 'assessment_1736156400000',
    userEmail: DEMO_USER_EMAIL,
    sessionType: 'comprehensive',
    startedAt: '2025-01-06T09:30:00Z',
    completedAt: '2025-01-06T10:00:00Z',
    status: 'completed',
    config: {
      totalQuestions: 12,
      timeLimit: 15,
      passingScore: 60,
      domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
      language: 'en'
    },
    responses: Array(12).fill(null).map((_, i) => ({
      questionId: `Q${String(i + 1).padStart(3, '0')}`,
      answer: ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)],
      timeSpent: 40 + Math.floor(Math.random() * 70),
      timestamp: new Date(Date.now() - 172800000 - (12 - i) * 60000).toISOString()
    })),
    results: {
      overallScore: 65,
      correctAnswers: 7,
      totalQuestions: 12,
      timeSpent: 700,
      performance: 'satisfactory',
      passed: true,
      domainScores: {
        engaging_with_ai: 67,
        creating_with_ai: 67,
        managing_with_ai: 50,
        designing_with_ai: 75
      },
      ksaScores: {
        knowledge: 70,
        skills: 65,
        attitudes: 75
      }
    },
    createdAt: '2025-01-06T09:30:00Z',
    updatedAt: '2025-01-06T10:00:00Z'
  },

  // Assessment Scenario (exam)
  [`v2/scenarios/${DEMO_USER_EMAIL}/scenario_assessment_001.json`]: {
    id: 'scenario_assessment_001',
    user_id: DEMO_USER_EMAIL,
    project_id: 'ai-literacy-foundation',
    type: 'assessment',
    title: 'AI Literacy Foundation Assessment',
    status: 'active',
    metadata: {
      examCode: 'assessment-ai-literacy',
      totalAttempts: 3,
      bestScore: 85,
      certificateEarned: true
    },
    started_at: '2025-01-06T09:00:00Z',
    last_active_at: '2025-01-08T10:00:00Z',
    created_at: '2025-01-06T09:00:00Z',
    updated_at: '2025-01-08T10:00:00Z'
  },

  // Assessment Programs (each exam attempt)
  [`v2/programs/${DEMO_USER_EMAIL}/program_assessment_001_attempt1.json`]: {
    id: 'program_assessment_001_attempt1',
    scenario_id: 'scenario_assessment_001',
    title: 'Practice Round 1',
    description: 'First practice attempt with instant feedback',
    program_order: 1,
    status: 'completed',
    config: {
      timeLimit: null,
      instantFeedback: true,
      allowSkip: true,
      showCorrectAnswers: true,
      attemptType: 'practice'
    },
    metadata: {
      attemptNumber: 1,
      score: 65,
      passed: true,
      questionsAnswered: 12
    },
    started_at: '2025-01-06T09:30:00Z',
    completed_at: '2025-01-06T10:00:00Z',
    created_at: '2025-01-06T09:30:00Z',
    updated_at: '2025-01-06T10:00:00Z'
  },

  [`v2/programs/${DEMO_USER_EMAIL}/program_assessment_001_attempt2.json`]: {
    id: 'program_assessment_001_attempt2',
    scenario_id: 'scenario_assessment_001',
    title: 'Practice Round 2',
    description: 'Second practice attempt with time limit',
    program_order: 2,
    status: 'completed',
    config: {
      timeLimit: 20,
      instantFeedback: true,
      allowSkip: true,
      showCorrectAnswers: true,
      attemptType: 'practice'
    },
    metadata: {
      attemptNumber: 2,
      score: 72,
      passed: true,
      questionsAnswered: 12,
      timeUsed: 18
    },
    started_at: '2025-01-07T09:30:00Z',
    completed_at: '2025-01-07T10:00:00Z',
    created_at: '2025-01-07T09:30:00Z',
    updated_at: '2025-01-07T10:00:00Z'
  },

  [`v2/programs/${DEMO_USER_EMAIL}/program_assessment_001_attempt3.json`]: {
    id: 'program_assessment_001_attempt3',
    scenario_id: 'scenario_assessment_001',
    title: 'Formal Assessment',
    description: 'Final formal assessment attempt for certification',
    program_order: 3,
    status: 'completed',
    config: {
      timeLimit: 30,
      instantFeedback: false,
      allowSkip: false,
      showCorrectAnswers: false,
      attemptType: 'formal',
      proctored: false
    },
    metadata: {
      attemptNumber: 3,
      score: 85,
      passed: true,
      questionsAnswered: 12,
      timeUsed: 25,
      certificateId: 'cert_1736329200000'
    },
    started_at: '2025-01-08T09:30:00Z',
    completed_at: '2025-01-08T10:00:00Z',
    created_at: '2025-01-08T09:30:00Z',
    updated_at: '2025-01-08T10:00:00Z'
  },

  // V2 Structure Marker
  'v2/README.md': {
    title: 'AI Square V2 Data Structure',
    description: 'This bucket follows the SCENARIO → PROGRAM → TASK → LOG architecture',
    version: '2.0',
    initialized: new Date().toISOString(),
    structure: {
      'v2/assessments/': 'Assessment session data organized by user email',
      'v2/user-history/': 'User assessment history and statistics',
      'v2/scenarios/': 'User learning journeys (PBL, Discovery, Assessment)',
      'v2/programs/': 'Learning phases within scenarios - Each assessment attempt is a program',
      'v2/tasks/': 'Individual learning activities - Assessment questions',
      'v2/logs/': 'Activity and interaction logs'
    },
    demoUser: DEMO_USER_EMAIL
  }
};

// Upload function
async function uploadToGCS(filePath, data) {
  const file = bucket.file(filePath);
  const dataString = JSON.stringify(data, null, 2);
  
  try {
    await file.save(dataString, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          version: 'v2',
          createdAt: new Date().toISOString()
        }
      }
    });
    console.log(`✅ Uploaded: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath}:`, error.message);
  }
}

// Clear function
async function clearV2Data() {
  console.log('🗑️  Clearing existing V2 data...');
  
  try {
    const [files] = await bucket.getFiles({ prefix: 'v2/' });
    
    for (const file of files) {
      await file.delete();
      console.log(`   Deleted: ${file.name}`);
    }
  } catch (error) {
    console.error('   Error clearing data:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Initializing GCS with V2 demo data...');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`👤 Demo User: ${DEMO_USER_EMAIL}`);
  console.log('');

  // Check bucket
  try {
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`❌ Bucket ${BUCKET_NAME} does not exist!`);
      console.log('\n💡 Tips:');
      console.log('1. Make sure you have set up Google Cloud credentials');
      console.log('2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
      console.log('3. Create the bucket in Google Cloud Console');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error accessing bucket:', error.message);
    console.log('\n💡 Tips:');
    console.log('1. Run: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"');
    console.log('2. Make sure the service account has Storage Object Admin permission');
    process.exit(1);
  }

  // Clear if requested
  if (process.argv.includes('--clear')) {
    await clearV2Data();
    console.log('');
  }

  // Upload demo data
  console.log('📤 Uploading demo assessment data...\n');
  
  for (const [filePath, data] of Object.entries(demoAssessmentData)) {
    await uploadToGCS(filePath, data);
  }

  console.log('\n✨ GCS initialization complete!');
  console.log('\n📊 Demo Data Summary:');
  console.log('- 1 Assessment Scenario (AI Literacy Foundation)');
  console.log('- 3 Programs (exam attempts): 2 practice + 1 formal');
  console.log('  - Practice 1: 65% (no time limit, instant feedback)');
  console.log('  - Practice 2: 72% (20 min limit, instant feedback)');
  console.log('  - Formal: 85% (30 min limit, no instant feedback, certificate earned)');
  console.log('- Different configurations per attempt');
  console.log('- Progress tracking across 4 AI domains');
  console.log('- KSA mastery visualization data');
  console.log(`\n🔗 Data location: gs://${BUCKET_NAME}/v2/`);
  console.log(`\n👉 Visit http://localhost:3000/v2/assessment to see the demo`);
}

// Run
main().catch(console.error);