#!/usr/bin/env node
/**
 * Initialize GCS with demo data for V2 architecture
 * This script sets up clean demo data following SCENARIO → PROGRAM → TASK → LOG structure
 */

import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';

// Configuration
const BUCKET_NAME = process.env.GCS_BUCKET_NAME_V2 || 'ai-square-db';
const DEMO_USER_EMAIL = 'demo@example.com';

// Initialize GCS
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

// Demo data structures
const demoData = {
  // V2 Assessment Data
  assessments: {
    // User's assessment history
    [`v2/user-history/${DEMO_USER_EMAIL}.json`]: {
      userEmail: DEMO_USER_EMAIL,
      assessments: [
        {
          id: 'assessment_1736329200000',
          completedAt: '2025-01-08T10:00:00Z',
          score: 85,
          passed: true,
          certificateId: 'cert_1736329200000'
        },
        {
          id: 'assessment_1736242800000',
          completedAt: '2025-01-07T10:00:00Z',
          score: 72,
          passed: true,
          certificateId: null
        }
      ],
      stats: {
        totalAssessments: 2,
        averageScore: 78.5,
        bestScore: 85,
        lastAssessmentDate: '2025-01-08T10:00:00Z',
        certificatesEarned: 1,
        domainProgress: {
          engaging_with_ai: { averageScore: 80, assessmentCount: 2, trend: 'improving' },
          creating_with_ai: { averageScore: 75, assessmentCount: 2, trend: 'stable' },
          managing_with_ai: { averageScore: 82, assessmentCount: 2, trend: 'improving' },
          designing_with_ai: { averageScore: 77, assessmentCount: 2, trend: 'stable' }
        },
        ksaProgress: {
          knowledge: 82,
          skills: 78,
          attitudes: 85
        }
      },
      createdAt: '2025-01-07T09:00:00Z',
      updatedAt: '2025-01-08T10:00:00Z'
    },

    // Individual assessment sessions
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
      responses: [
        { questionId: 'E001', answer: 'b', timeSpent: 45, timestamp: '2025-01-08T09:31:00Z' },
        { questionId: 'E002', answer: 'c', timeSpent: 60, timestamp: '2025-01-08T09:32:00Z' },
        { questionId: 'E003', answer: 'a', timeSpent: 30, timestamp: '2025-01-08T09:33:00Z' },
        { questionId: 'C001', answer: 'b', timeSpent: 50, timestamp: '2025-01-08T09:34:00Z' },
        { questionId: 'C002', answer: 'd', timeSpent: 40, timestamp: '2025-01-08T09:35:00Z' },
        { questionId: 'C003', answer: 'a', timeSpent: 55, timestamp: '2025-01-08T09:36:00Z' },
        { questionId: 'M001', answer: 'c', timeSpent: 35, timestamp: '2025-01-08T09:37:00Z' },
        { questionId: 'M002', answer: 'b', timeSpent: 45, timestamp: '2025-01-08T09:38:00Z' },
        { questionId: 'M003', answer: 'd', timeSpent: 50, timestamp: '2025-01-08T09:39:00Z' },
        { questionId: 'D001', answer: 'a', timeSpent: 40, timestamp: '2025-01-08T09:40:00Z' },
        { questionId: 'D002', answer: 'c', timeSpent: 60, timestamp: '2025-01-08T09:41:00Z' },
        { questionId: 'D003', answer: 'b', timeSpent: 45, timestamp: '2025-01-08T09:42:00Z' }
      ],
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
            { code: 'K001', name: 'AI Fundamentals', mastery: 2, correct: 3, total: 3 },
            { code: 'K002', name: 'AI Applications', mastery: 1, correct: 2, total: 3 },
            { code: 'K003', name: 'AI Ethics', mastery: 2, correct: 3, total: 3 }
          ],
          skills: [
            { code: 'S001', name: 'Prompt Engineering', mastery: 2, correct: 2, total: 2 },
            { code: 'S002', name: 'AI Tool Selection', mastery: 1, correct: 2, total: 3 },
            { code: 'S003', name: 'AI Output Evaluation', mastery: 2, correct: 3, total: 3 }
          ],
          attitudes: [
            { code: 'A001', name: 'Critical Thinking', mastery: 2, correct: 3, total: 3 },
            { code: 'A002', name: 'Ethical Consideration', mastery: 2, correct: 3, total: 3 },
            { code: 'A003', name: 'Continuous Learning', mastery: 2, correct: 2, total: 2 }
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
      responses: [
        { questionId: 'E001', answer: 'b', timeSpent: 50, timestamp: '2025-01-07T09:31:00Z' },
        { questionId: 'E002', answer: 'a', timeSpent: 65, timestamp: '2025-01-07T09:32:00Z' },
        { questionId: 'E003', answer: 'a', timeSpent: 35, timestamp: '2025-01-07T09:33:00Z' },
        { questionId: 'C001', answer: 'c', timeSpent: 55, timestamp: '2025-01-07T09:34:00Z' },
        { questionId: 'C002', answer: 'd', timeSpent: 45, timestamp: '2025-01-07T09:35:00Z' },
        { questionId: 'C003', answer: 'b', timeSpent: 60, timestamp: '2025-01-07T09:36:00Z' },
        { questionId: 'M001', answer: 'c', timeSpent: 40, timestamp: '2025-01-07T09:37:00Z' },
        { questionId: 'M002', answer: 'a', timeSpent: 50, timestamp: '2025-01-07T09:38:00Z' },
        { questionId: 'M003', answer: 'd', timeSpent: 55, timestamp: '2025-01-07T09:39:00Z' },
        { questionId: 'D001', answer: 'b', timeSpent: 45, timestamp: '2025-01-07T09:40:00Z' },
        { questionId: 'D002', answer: 'c', timeSpent: 65, timestamp: '2025-01-07T09:41:00Z' },
        { questionId: 'D003', answer: 'a', timeSpent: 50, timestamp: '2025-01-07T09:42:00Z' }
      ],
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
    }
  },

  // V2 Scenarios (following new architecture)
  scenarios: {
    // PBL Scenario
    [`v2/scenarios/${DEMO_USER_EMAIL}/scenario_pbl_001.json`]: {
      id: 'scenario_pbl_001',
      user_id: DEMO_USER_EMAIL,
      project_id: 'project_ai_job_search',
      type: 'pbl',
      title: "Demo User's AI Job Search Learning Journey",
      status: 'active',
      metadata: {
        startReason: 'Career transition to AI field',
        learningGoals: ['Master AI job search tools', 'Build AI-enhanced portfolio']
      },
      started_at: '2025-01-05T10:00:00Z',
      last_active_at: '2025-01-08T14:00:00Z',
      created_at: '2025-01-05T10:00:00Z',
      updated_at: '2025-01-08T14:00:00Z'
    },

    // Discovery Scenario
    [`v2/scenarios/${DEMO_USER_EMAIL}/scenario_discovery_001.json`]: {
      id: 'scenario_discovery_001',
      user_id: DEMO_USER_EMAIL,
      project_id: 'career_ai_pm',
      type: 'discovery',
      title: "Exploring AI Product Manager Career Path",
      status: 'active',
      metadata: {
        career: 'AI Product Manager',
        explorationDepth: 3,
        branchesExplored: ['daily_routine', 'crisis_management']
      },
      started_at: '2025-01-06T09:00:00Z',
      last_active_at: '2025-01-08T11:00:00Z',
      created_at: '2025-01-06T09:00:00Z',
      updated_at: '2025-01-08T11:00:00Z'
    }
  },

  // V2 Programs
  programs: {
    // PBL Programs
    [`v2/programs/${DEMO_USER_EMAIL}/program_pbl_001_foundation.json`]: {
      id: 'program_pbl_001_foundation',
      scenario_id: 'scenario_pbl_001',
      title: 'Foundation: Understanding AI Job Search',
      description: 'Learn the basics of using AI for job searching',
      program_order: 1,
      status: 'completed',
      config: {
        ai_modules: ['research_assistant', 'writing_assistant']
      },
      metadata: {
        stage: 'foundation',
        prerequisites: []
      },
      started_at: '2025-01-05T10:30:00Z',
      completed_at: '2025-01-06T16:00:00Z',
      created_at: '2025-01-05T10:00:00Z',
      updated_at: '2025-01-06T16:00:00Z'
    },

    [`v2/programs/${DEMO_USER_EMAIL}/program_pbl_001_advanced.json`]: {
      id: 'program_pbl_001_advanced',
      scenario_id: 'scenario_pbl_001',
      title: 'Advanced: AI-Powered Job Application',
      description: 'Master advanced techniques for AI-enhanced applications',
      program_order: 2,
      status: 'active',
      config: {
        ai_modules: ['interview_prep', 'portfolio_builder']
      },
      metadata: {
        stage: 'advanced',
        prerequisites: ['program_pbl_001_foundation']
      },
      started_at: '2025-01-07T09:00:00Z',
      created_at: '2025-01-05T10:00:00Z',
      updated_at: '2025-01-08T14:00:00Z'
    },

    // Discovery Programs
    [`v2/programs/${DEMO_USER_EMAIL}/program_discovery_001_daily.json`]: {
      id: 'program_discovery_001_daily',
      scenario_id: 'scenario_discovery_001',
      title: 'Day in the Life of an AI PM',
      description: 'Experience typical daily activities',
      program_order: 1,
      status: 'completed',
      metadata: {
        scenario_type: 'daily_routine',
        career: 'AI Product Manager',
        is_expandable: true
      },
      started_at: '2025-01-06T09:30:00Z',
      completed_at: '2025-01-06T17:00:00Z',
      created_at: '2025-01-06T09:00:00Z',
      updated_at: '2025-01-06T17:00:00Z'
    },

    [`v2/programs/${DEMO_USER_EMAIL}/program_discovery_001_crisis.json`]: {
      id: 'program_discovery_001_crisis',
      scenario_id: 'scenario_discovery_001',
      title: 'AI PM Crisis Management',
      description: 'Handle challenging situations as an AI PM',
      program_order: 2,
      status: 'active',
      metadata: {
        scenario_type: 'crisis_management',
        career: 'AI Product Manager',
        is_expandable: true
      },
      started_at: '2025-01-07T10:00:00Z',
      created_at: '2025-01-06T09:00:00Z',
      updated_at: '2025-01-08T11:00:00Z'
    }
  },

  // V2 Tasks
  tasks: {
    // PBL Tasks
    [`v2/tasks/${DEMO_USER_EMAIL}/task_pbl_001_001.json`]: {
      id: 'task_pbl_001_001',
      program_id: 'program_pbl_001_foundation',
      title: 'Understanding AI Job Search Tools',
      description: 'Research and compare different AI-powered job search platforms',
      task_order: 1,
      type: 'chat',
      required_ksa: ['K001', 'S002'],
      status: 'completed',
      metadata: {
        can_repeat: true,
        difficulty: 'beginner'
      },
      started_at: '2025-01-05T10:30:00Z',
      completed_at: '2025-01-05T11:30:00Z',
      created_at: '2025-01-05T10:00:00Z',
      updated_at: '2025-01-05T11:30:00Z'
    },

    // Discovery Tasks (dynamically generated)
    [`v2/tasks/${DEMO_USER_EMAIL}/task_discovery_001_001.json`]: {
      id: 'task_discovery_001_001',
      program_id: 'program_discovery_001_daily',
      title: 'Morning Team Stand-up',
      description: 'Lead the daily AI team sync meeting',
      task_order: 1,
      type: 'discussion',
      required_ksa: ['S003', 'A001'],
      status: 'completed',
      metadata: {
        generated: true,
        generation_context: 'daily_routine_start',
        can_branch: true
      },
      started_at: '2025-01-06T09:30:00Z',
      completed_at: '2025-01-06T10:00:00Z',
      created_at: '2025-01-06T09:30:00Z',
      updated_at: '2025-01-06T10:00:00Z'
    }
  },

  // V2 Logs
  logs: {
    // Scenario start log
    [`v2/logs/${DEMO_USER_EMAIL}/log_001.json`]: {
      id: 'log_001',
      scenario_id: 'scenario_pbl_001',
      user_id: DEMO_USER_EMAIL,
      log_type: 'achievement',
      activity: 'scenario_started',
      data: {
        project_id: 'project_ai_job_search',
        project_title: 'AI-Powered Job Search'
      },
      created_at: '2025-01-05T10:00:00Z'
    },

    // Task submission log
    [`v2/logs/${DEMO_USER_EMAIL}/log_002.json`]: {
      id: 'log_002',
      scenario_id: 'scenario_pbl_001',
      program_id: 'program_pbl_001_foundation',
      task_id: 'task_pbl_001_001',
      user_id: DEMO_USER_EMAIL,
      log_type: 'submission',
      activity: 'task_submitted',
      data: {
        response: {
          platforms_researched: ['LinkedIn AI', 'Indeed AI Match', 'Google Jobs'],
          comparison_notes: 'LinkedIn AI provides best personalization...'
        }
      },
      duration_seconds: 3600,
      created_at: '2025-01-05T11:30:00Z'
    }
  },

  // Clean up old/legacy data markers
  cleanup: {
    // Marker files to indicate clean structure
    'v2/README.md': {
      title: 'V2 Data Structure',
      description: 'This bucket follows the SCENARIO → PROGRAM → TASK → LOG architecture',
      version: '2.0',
      initialized: new Date().toISOString(),
      structure: {
        assessments: 'Assessment session data and user history',
        scenarios: 'User learning journeys',
        programs: 'Learning phases within scenarios',
        tasks: 'Individual learning activities',
        logs: 'Activity and interaction logs'
      }
    }
  }
};

// Function to upload data to GCS
async function uploadToGCS(filePath: string, data: any) {
  const file = bucket.file(filePath);
  const dataString = JSON.stringify(data, null, 2);
  
  try {
    await file.save(dataString, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          version: 'v2',
          createdAt: new Date().toISOString(),
          dataType: filePath.split('/')[1] // assessments, scenarios, etc.
        }
      }
    });
    console.log(`✅ Uploaded: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath}:`, error);
  }
}

// Function to clear existing data (optional)
async function clearExistingData() {
  console.log('🗑️  Clearing existing V2 data...');
  
  const prefixes = ['v2/assessments/', 'v2/scenarios/', 'v2/programs/', 'v2/tasks/', 'v2/logs/', 'v2/user-history/'];
  
  for (const prefix of prefixes) {
    try {
      const [files] = await bucket.getFiles({ prefix });
      
      for (const file of files) {
        await file.delete();
        console.log(`   Deleted: ${file.name}`);
      }
    } catch (error) {
      console.error(`   Error clearing ${prefix}:`, error);
    }
  }
}

// Main initialization function
async function initializeGCSDemo() {
  console.log('🚀 Initializing GCS with V2 demo data...');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`👤 Demo User: ${DEMO_USER_EMAIL}`);
  console.log('');

  // Check if bucket exists
  try {
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`❌ Bucket ${BUCKET_NAME} does not exist!`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error accessing bucket:', error);
    process.exit(1);
  }

  // Optional: Clear existing data
  const args = process.argv.slice(2);
  if (args.includes('--clear')) {
    await clearExistingData();
    console.log('');
  }

  // Upload all demo data
  console.log('📤 Uploading demo data...');
  
  for (const [category, files] of Object.entries(demoData)) {
    console.log(`\n📁 ${category.toUpperCase()}:`);
    
    for (const [filePath, data] of Object.entries(files)) {
      await uploadToGCS(filePath, data);
    }
  }

  console.log('\n✨ GCS initialization complete!');
  console.log('\n📊 Summary:');
  console.log('- 2 assessment sessions with results');
  console.log('- 1 PBL scenario (AI Job Search) with 2 programs');
  console.log('- 1 Discovery scenario (AI PM) with 2 programs');
  console.log('- Sample tasks and activity logs');
  console.log(`\n🔗 Access at: gs://${BUCKET_NAME}/v2/`);
}

// Run the initialization
initializeGCSDemo().catch(console.error);