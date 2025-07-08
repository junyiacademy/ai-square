/**
 * Mock Data Initialization for V2 Testing
 * Creates sample data for all three structure types
 */

import { 
  Track, 
  Program, 
  Task, 
  Project,
  QuickAssessmentOptions,
  DiscoveryStartOptions
} from '../types';

// Mock Projects (Learning Scenarios)
export const mockProjects: Project[] = [
  {
    id: 'proj_ai_job_search',
    code: 'ai-job-search',
    title: 'AI-Powered Job Search Mastery',
    description: 'Learn to leverage AI tools throughout your job search journey, from market research to interview preparation',
    difficulty: 'intermediate',
    estimated_duration: 90,
    target_domains: ['engaging_with_ai', 'creating_with_ai'],
    prerequisites: ['Basic computer skills', 'Existing resume'],
    learning_objectives: [
      'Master AI-powered job market research techniques',
      'Optimize resume and cover letters using AI tools',
      'Develop interview skills through AI practice',
      'Build confidence in using AI for career advancement'
    ],
    ksa_mapping: {
      knowledge: ['K1.1', 'K1.2', 'K2.1', 'K2.3'],
      skills: ['S1.1', 'S1.2', 'S2.1', 'S2.3'],
      attitudes: ['A1.1', 'A1.2', 'A2.1']
    },
    is_active: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01')
  },
  {
    id: 'proj_smart_city',
    code: 'high-school-smart-city',
    title: 'Smart City Planning with AI',
    description: 'Design future cities using AI-powered urban planning tools and understand the impact of technology on urban life',
    difficulty: 'beginner',
    estimated_duration: 60,
    target_domains: ['designing_with_ai', 'managing_with_ai'],
    prerequisites: ['Basic understanding of cities', 'Interest in technology'],
    learning_objectives: [
      'Understand smart city concepts',
      'Use AI for traffic optimization',
      'Design sustainable urban solutions',
      'Evaluate AI impact on city life'
    ],
    ksa_mapping: {
      knowledge: ['K3.1', 'K3.2', 'K4.1'],
      skills: ['S3.1', 'S3.2', 'S4.1'],
      attitudes: ['A3.1', 'A4.1', 'A4.2']
    },
    is_active: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01')
  },
  {
    id: 'proj_ai_education',
    code: 'ai-education-design',
    title: 'AI in Education Design',
    description: 'Create innovative educational experiences using AI tools, from personalized learning to automated assessment',
    difficulty: 'advanced',
    estimated_duration: 120,
    target_domains: ['creating_with_ai', 'designing_with_ai'],
    prerequisites: ['Teaching or training experience', 'Basic AI knowledge'],
    learning_objectives: [
      'Design AI-enhanced curricula',
      'Create personalized learning paths',
      'Implement AI assessment tools',
      'Evaluate ethical considerations'
    ],
    ksa_mapping: {
      knowledge: ['K2.1', 'K2.2', 'K4.1', 'K4.2'],
      skills: ['S2.1', 'S2.2', 'S4.1', 'S4.2'],
      attitudes: ['A2.1', 'A2.2', 'A4.1']
    },
    is_active: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01')
  }
];

// Mock Assessment Data
export const mockAssessmentOptions: QuickAssessmentOptions = {
  title: 'AI Literacy Foundation Assessment',
  description: 'Test your understanding of fundamental AI concepts and their applications',
  difficulty: 'intermediate',
  time_limit: 30,
  domains: ['engaging_with_ai', 'creating_with_ai'],
  questions: [
    {
      question: 'What is the primary purpose of a Large Language Model (LLM)?',
      type: 'multiple_choice',
      options: [
        'To store large amounts of data',
        'To understand and generate human-like text',
        'To create visual images',
        'To perform mathematical calculations'
      ],
      correct_answer: 'To understand and generate human-like text'
    },
    {
      question: 'Explain the concept of "prompt engineering" in your own words.',
      type: 'short_answer'
    },
    {
      question: 'Which of the following is NOT a common ethical concern with AI?',
      type: 'multiple_choice',
      options: [
        'Bias in training data',
        'Privacy and data protection',
        'Environmental impact',
        'Faster processing speeds'
      ],
      correct_answer: 'Faster processing speeds'
    },
    {
      question: 'Describe a scenario where AI could be beneficial in education, and discuss potential challenges.',
      type: 'essay'
    },
    {
      question: 'What does "AI hallucination" refer to?',
      type: 'multiple_choice',
      options: [
        'When AI systems dream',
        'When AI generates false or nonsensical information',
        'When AI creates visual illusions',
        'When AI systems overheat'
      ],
      correct_answer: 'When AI generates false or nonsensical information'
    }
  ]
};

// Mock Discovery Data
export const mockDiscoveryOptions: DiscoveryStartOptions = {
  topic: 'AI Product Manager',
  language: 'en',
  difficulty: 'intermediate',
  user_context: 'I\'m interested in transitioning to a career as an AI Product Manager'
};

// Mock Adaptive Assessment Data
export const mockAdaptiveAssessmentOptions = {
  title: 'Adaptive AI Skills Assessment',
  description: 'An assessment that adapts to your skill level as you progress',
  domain: 'creating_with_ai',
  initial_difficulty: 'intermediate' as const,
  max_questions: 10
};

// Mock Certification Assessment Data
export const mockCertificationOptions = {
  certification_type: 'AI Literacy Foundation',
  domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
  passing_score: 80,
  time_limit: 90
};

// Helper function to generate mock user data
export function generateMockUser(email?: string) {
  return {
    id: `user_${Date.now()}`,
    email: email || `test_${Date.now()}@example.com`,
    display_name: 'Test User',
    language_preference: 'en',
    created_at: new Date(),
    updated_at: new Date()
  };
}

// Helper function to simulate API response
export function mockApiResponse<T>(data: T, delay = 500): Promise<{ success: boolean; data: T }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data
      });
    }, delay);
  });
}

// Mock Track Creation Results
export const mockTrackResults = {
  pbl: {
    id: 'track_pbl_mock',
    code: 'pbl-ai-job-search',
    title: 'AI-Powered Job Search Mastery',
    description: 'Standard PBL track with multiple programs',
    structure_type: 'standard' as const,
    order_index: 0,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    programs: [
      {
        id: 'prog_foundation',
        track_id: 'track_pbl_mock',
        code: 'foundation',
        title: 'Foundation',
        description: 'Learn the basics of AI in job searching',
        difficulty_level: 'beginner' as const,
        order_index: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        tasks: [
          {
            id: 'task_intro',
            program_id: 'prog_foundation',
            code: 'task-1',
            title: 'Introduction to AI Job Search',
            description: 'Understanding how AI can help in your job search',
            instructions: 'Follow the AI tutor to learn the basics',
            task_type: 'learning' as const,
            order_index: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_practice',
            program_id: 'prog_foundation',
            code: 'task-2',
            title: 'Practice with AI Tools',
            description: 'Hands-on practice with job search AI tools',
            instructions: 'Complete exercises with AI assistance',
            task_type: 'practice' as const,
            order_index: 1,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      },
      {
        id: 'prog_advanced',
        track_id: 'track_pbl_mock',
        code: 'advanced',
        title: 'Advanced Techniques',
        description: 'Master advanced AI job search strategies',
        difficulty_level: 'intermediate' as const,
        order_index: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        tasks: [
          {
            id: 'task_adv_1',
            program_id: 'prog_advanced',
            code: 'task-1',
            title: 'AI Resume Optimization',
            description: 'Use AI to create targeted resumes',
            instructions: 'Learn advanced resume techniques',
            task_type: 'learning' as const,
            order_index: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      }
    ]
  },
  discovery: {
    id: 'track_discovery_mock',
    code: 'discovery-ai-pm',
    title: 'Exploring AI Product Manager Career',
    description: 'Multiple scenario-based programs for career exploration',
    structure_type: 'standard' as const,
    order_index: 0,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    programs: [
      {
        id: 'prog_daily',
        track_id: 'track_discovery_mock',
        code: 'daily_routine',
        title: 'Day in the Life of an AI Product Manager',
        description: 'Experience typical daily activities and responsibilities',
        difficulty_level: 'intermediate' as const,
        order_index: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        tasks: [
          {
            id: 'task_morning',
            program_id: 'prog_daily',
            code: 'morning_briefing',
            title: 'Morning Team Briefing',
            description: 'Start your day with the team standup',
            instructions: 'Participate in the meeting and understand priorities',
            task_type: 'learning' as const,
            task_variant: 'exploration' as const,
            order_index: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_core',
            program_id: 'prog_daily',
            code: 'core_work',
            title: 'Core AI PM Task',
            description: 'Work on product requirements for AI feature',
            instructions: 'Define requirements and work with engineers',
            task_type: 'practice' as const,
            task_variant: 'exploration' as const,
            order_index: 1,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      },
      {
        id: 'prog_challenge',
        track_id: 'track_discovery_mock',
        code: 'challenge',
        title: 'AI PM Challenge Scenario',
        description: 'Handle a challenging situation that tests your skills',
        difficulty_level: 'advanced' as const,
        order_index: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        tasks: [
          {
            id: 'task_crisis',
            program_id: 'prog_challenge',
            code: 'crisis_brief',
            title: 'Urgent Situation Briefing',
            description: 'AI model bias discovered in production',
            instructions: 'Review the situation and prepare your response',
            task_type: 'learning' as const,
            task_variant: 'exploration' as const,
            order_index: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_solution',
            program_id: 'prog_challenge',
            code: 'problem_solving',
            title: 'Develop Solution Strategy',
            description: 'Create a comprehensive solution plan',
            instructions: 'Work with stakeholders to resolve the issue',
            task_type: 'practice' as const,
            task_variant: 'exploration' as const,
            order_index: 1,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      },
      {
        id: 'prog_growth',
        track_id: 'track_discovery_mock',
        code: 'career_growth',
        title: 'AI PM Career Growth',
        description: 'Explore advancement opportunities and career decisions',
        difficulty_level: 'intermediate' as const,
        order_index: 2,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        tasks: [
          {
            id: 'task_paths',
            program_id: 'prog_growth',
            code: 'career_options',
            title: 'Explore Career Paths',
            description: 'Discover growth opportunities',
            instructions: 'Explore different career advancement options',
            task_type: 'learning' as const,
            task_variant: 'exploration' as const,
            order_index: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_decision',
            program_id: 'prog_growth',
            code: 'career_decision',
            title: 'Make a Career Decision',
            description: 'Choose your next career move',
            instructions: 'Evaluate options and make a decision',
            task_type: 'practice' as const,
            task_variant: 'exploration' as const,
            order_index: 1,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      }
    ]
  },
  assessment: {
    id: 'track_assessment_mock',
    code: 'assessment-ai-literacy',
    title: 'AI Literacy Foundation Assessment',
    description: 'Direct-task assessment track',
    structure_type: 'direct_task' as const,
    order_index: 0,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    programs: [
      {
        id: 'prog_assessment',
        track_id: 'track_assessment_mock',
        code: 'tasks',
        title: 'Tasks',
        description: 'Direct tasks',
        difficulty_level: 'intermediate' as const,
        order_index: 0,
        is_active: true,
        is_virtual: true,
        created_at: new Date(),
        updated_at: new Date(),
        tasks: [
          {
            id: 'task_q1',
            program_id: 'prog_assessment',
            code: 'q1',
            title: 'Question 1',
            description: 'What is the primary purpose of a Large Language Model (LLM)?',
            instructions: 'Select the best answer',
            task_type: 'assessment' as const,
            task_variant: 'question' as const,
            order_index: 0,
            is_active: true,
            metadata: {
              question_type: 'multiple_choice',
              options: [
                'To store large amounts of data',
                'To understand and generate human-like text',
                'To create visual images',
                'To perform mathematical calculations'
              ],
              correct_answer: 'To understand and generate human-like text'
            },
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_q2',
            program_id: 'prog_assessment',
            code: 'q2',
            title: 'Question 2',
            description: 'Explain prompt engineering',
            instructions: 'Provide a brief answer',
            task_type: 'assessment' as const,
            task_variant: 'question' as const,
            order_index: 1,
            is_active: true,
            metadata: {
              question_type: 'short_answer'
            },
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      }
    ]
  }
};