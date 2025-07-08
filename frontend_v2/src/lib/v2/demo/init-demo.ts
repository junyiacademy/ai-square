/**
 * V2 Demo Data Initialization
 * Sets up demo data in storage for testing
 */

import { StorageFactory } from '@/lib/v2/storage/storage.factory';
import { demoSourceContent } from './demo-data';

export async function initializeDemoData(): Promise<void> {
  try {
    console.log('Initializing V2 demo data...');
    
    // Get storage service
    const storage = await StorageFactory.getStorage();
    
    // Check if already initialized
    const initFlag = await storage.exists('demo/initialized');
    if (initFlag) {
      console.log('Demo data already initialized');
      return;
    }
    
    // Save source content
    console.log('Saving source content...');
    const sourceContentItems = demoSourceContent.map(item => ({
      key: `source_content/${item.id}`,
      data: item
    }));
    
    await storage.bulkSave(sourceContentItems);
    
    // Create demo user scenarios
    console.log('Creating demo scenarios...');
    const demoUserEmail = 'demo@example.com';
    const demoScenarios = [
      {
        id: 'demo_scenario_001',
        user_id: demoUserEmail,
        source_id: 'pbl_001',
        type: 'pbl' as const,
        title: 'AI-Powered Job Search - Demo User',
        status: 'active' as const,
        metadata: {
          source_code: 'ai-job-search',
          language: 'en'
        },
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'demo_scenario_002',
        user_id: demoUserEmail,
        source_id: 'assessment_001',
        type: 'assessment' as const,
        title: 'AI Literacy Foundation Assessment - Demo User',
        status: 'completed' as const,
        metadata: {
          source_code: 'ai-literacy-foundation',
          language: 'en'
        },
        started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 30 min later
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
      }
    ];
    
    const scenarioItems = demoScenarios.map(scenario => ({
      key: `scenarios/${scenario.id}`,
      data: scenario
    }));
    
    await storage.bulkSave(scenarioItems);
    
    // Create demo programs
    console.log('Creating demo programs...');
    const demoPrograms = [
      // PBL Programs
      {
        id: 'demo_program_001',
        scenario_id: 'demo_scenario_001',
        title: 'Foundation: Understanding AI Tools',
        description: 'Learn about different AI tools for job searching',
        program_order: 0,
        status: 'completed' as const,
        config: {
          stage_id: 'foundation',
          learning_objectives: ['Understand AI tools', 'Analyze resumes']
        },
        metadata: {
          estimated_duration: 60,
          difficulty_level: 'intermediate'
        },
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'demo_program_002',
        scenario_id: 'demo_scenario_001',
        title: 'Advanced: Practical Application',
        description: 'Apply AI tools to your job search',
        program_order: 1,
        status: 'active' as const,
        config: {
          stage_id: 'advanced',
          learning_objectives: ['Apply AI tools', 'Practice interviews']
        },
        metadata: {
          estimated_duration: 60,
          difficulty_level: 'intermediate'
        },
        started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      // Assessment Program
      {
        id: 'demo_program_003',
        scenario_id: 'demo_scenario_002',
        title: 'Formal Assessment 1',
        description: 'Formal assessment for certification',
        program_order: 0,
        status: 'completed' as const,
        config: {
          attempt_type: 'formal',
          attempt_number: 1,
          time_limit: 30,
          instant_feedback: false,
          allow_skip: false
        },
        metadata: {
          total_questions: 3,
          time_spent: 1200, // 20 minutes
          final_score: 83.33,
          total_points: 25,
          max_points: 30,
          level: 'Proficient'
        },
        started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString()
      }
    ];
    
    const programItems = demoPrograms.map(program => ({
      key: `programs/${program.id}`,
      data: program
    }));
    
    await storage.bulkSave(programItems);
    
    // Create demo tasks
    console.log('Creating demo tasks...');
    const demoTasks = [
      // Foundation tasks
      {
        id: 'demo_task_001',
        program_id: 'demo_program_001',
        title: 'Introduction to AI Job Search Tools',
        description: 'Explore various AI-powered platforms',
        task_order: 0,
        type: 'chat' as const,
        required_ksa: ['K1.1', 'S1.2'],
        config: {},
        metadata: {
          can_repeat: true,
          estimated_duration: 20,
          difficulty: 'medium'
        },
        status: 'completed' as const,
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString()
      },
      {
        id: 'demo_task_002',
        program_id: 'demo_program_001',
        title: 'Resume Analysis with AI',
        description: 'Use AI to analyze and improve your resume',
        task_order: 1,
        type: 'submission' as const,
        required_ksa: ['K2.1', 'S2.3'],
        config: {},
        metadata: {
          can_repeat: true,
          estimated_duration: 30,
          difficulty: 'medium'
        },
        status: 'completed' as const,
        started_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString()
      },
      // Advanced tasks
      {
        id: 'demo_task_003',
        program_id: 'demo_program_002',
        title: 'AI-Powered Job Matching',
        description: 'Find jobs that match your skills using AI',
        task_order: 0,
        type: 'chat' as const,
        required_ksa: ['K3.1', 'S3.2', 'A1.1'],
        config: {},
        metadata: {
          can_repeat: true,
          estimated_duration: 25,
          difficulty: 'medium'
        },
        status: 'completed' as const,
        started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString()
      },
      {
        id: 'demo_task_004',
        program_id: 'demo_program_002',
        title: 'Interview Practice with AI',
        description: 'Practice common interview questions with AI feedback',
        task_order: 1,
        type: 'discussion' as const,
        required_ksa: ['S4.1', 'A2.1'],
        config: {},
        metadata: {
          can_repeat: true,
          estimated_duration: 30,
          difficulty: 'hard'
        },
        status: 'active' as const,
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    const taskItems = demoTasks.map(task => ({
      key: `tasks/${task.id}`,
      data: task
    }));
    
    await storage.bulkSave(taskItems);
    
    // Mark as initialized
    await storage.save('demo/initialized', {
      initialized: true,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
    
    console.log('✅ V2 demo data initialized successfully');
  } catch (error) {
    console.error('Failed to initialize demo data:', error);
    throw error;
  }
}

/**
 * Reset demo data
 */
export async function resetDemoData(): Promise<void> {
  try {
    const storage = await StorageFactory.getStorage();
    
    // Delete initialization flag
    await storage.delete('demo/initialized');
    
    // Re-initialize
    await initializeDemoData();
  } catch (error) {
    console.error('Failed to reset demo data:', error);
    throw error;
  }
}