/**
 * V2 Demo Data
 * Sample source content for testing
 */

import { SourceContent } from '@/lib/v2/interfaces/base';

export const demoSourceContent: SourceContent[] = [
  // PBL Scenarios
  {
    id: 'pbl_001',
    type: 'pbl',
    code: 'ai-job-search',
    title: 'AI-Powered Job Search',
    description: 'Learn how to leverage AI tools for job searching, resume optimization, and interview preparation',
    objectives: [
      'Understand AI tools available for job searching',
      'Optimize your resume using AI',
      'Practice interview skills with AI coaching'
    ],
    prerequisites: ['Basic computer skills'],
    metadata: {
      duration: 120,
      difficulty: 'intermediate',
      stages: [
        {
          id: 'foundation',
          title: 'Foundation: Understanding AI Tools',
          description: 'Learn about different AI tools for job searching',
          tasks: [
            {
              title: 'Introduction to AI Job Search Tools',
              description: 'Explore various AI-powered platforms',
              type: 'chat',
              required_ksa: ['K1.1', 'S1.2']
            },
            {
              title: 'Resume Analysis with AI',
              description: 'Use AI to analyze and improve your resume',
              type: 'submission',
              required_ksa: ['K2.1', 'S2.3']
            }
          ]
        },
        {
          id: 'advanced',
          title: 'Advanced: Practical Application',
          description: 'Apply AI tools to your job search',
          tasks: [
            {
              title: 'AI-Powered Job Matching',
              description: 'Find jobs that match your skills using AI',
              type: 'chat',
              required_ksa: ['K3.1', 'S3.2', 'A1.1']
            },
            {
              title: 'Interview Practice with AI',
              description: 'Practice common interview questions with AI feedback',
              type: 'discussion',
              required_ksa: ['S4.1', 'A2.1']
            }
          ]
        }
      ]
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pbl_002',
    type: 'pbl',
    code: 'ai-content-creation',
    title: 'AI for Content Creation',
    description: 'Master the use of AI tools for creating engaging content across different media',
    objectives: [
      'Generate high-quality written content with AI',
      'Create visual content using AI tools',
      'Understand ethical considerations in AI content creation'
    ],
    prerequisites: ['Basic writing skills', 'Creativity'],
    metadata: {
      duration: 90,
      difficulty: 'beginner',
      stages: [
        {
          id: 'foundation',
          title: 'Foundation: AI Writing Tools',
          description: 'Learn to use AI for writing',
          tasks: [
            {
              title: 'Introduction to AI Writing',
              description: 'Explore AI writing assistants',
              type: 'chat',
              required_ksa: ['K1.2', 'S1.3']
            }
          ]
        }
      ]
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Discovery Careers
  {
    id: 'discovery_001',
    type: 'discovery',
    code: 'ai-product-manager',
    title: 'AI Product Manager',
    description: 'Explore the role of an AI Product Manager and what it takes to succeed in this career',
    objectives: [
      'Understand daily responsibilities of an AI PM',
      'Experience decision-making scenarios',
      'Learn about career growth opportunities'
    ],
    prerequisites: [],
    metadata: {
      salary_range: '$120,000 - $250,000',
      growth_rate: '22% (Much faster than average)',
      skills: ['Product Strategy', 'AI/ML Understanding', 'Data Analysis', 'Stakeholder Management', 'Agile/Scrum'],
      total_xp: 500,
      career_info: {
        education: "Bachelor's degree in CS, Business, or related field",
        experience: '3-5 years in product management',
        certifications: ['AI Product Management Certificate', 'Scrum Master']
      }
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'discovery_002',
    type: 'discovery',
    code: 'data-scientist',
    title: 'Data Scientist',
    description: 'Discover the world of data science and machine learning',
    objectives: [
      'Work with real datasets',
      'Build predictive models',
      'Present insights to stakeholders'
    ],
    prerequisites: [],
    metadata: {
      salary_range: '$100,000 - $180,000',
      growth_rate: '36% (Much faster than average)',
      skills: ['Python', 'Machine Learning', 'Statistics', 'Data Visualization', 'SQL'],
      total_xp: 600
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Assessments
  {
    id: 'assessment_001',
    type: 'assessment',
    code: 'ai-literacy-foundation',
    title: 'AI Literacy Foundation Assessment',
    description: 'Test your foundational knowledge of AI concepts and applications',
    objectives: [
      'Demonstrate understanding of AI basics',
      'Identify appropriate AI use cases',
      'Recognize AI limitations and ethical considerations'
    ],
    prerequisites: [],
    metadata: {
      questions: [
        {
          id: 'q1',
          text: 'What is Machine Learning?',
          options: [
            { id: 'A', text: 'A type of artificial intelligence that enables systems to learn from data' },
            { id: 'B', text: 'A programming language for robots' },
            { id: 'C', text: 'A hardware component in computers' },
            { id: 'D', text: 'A social media algorithm' }
          ],
          correct_answer: 'A',
          points: 10,
          domain: 'fundamentals',
          explanation: 'Machine Learning is a subset of AI that allows systems to learn and improve from experience without being explicitly programmed.'
        },
        {
          id: 'q2',
          text: 'Which of these is an ethical concern with AI?',
          options: [
            { id: 'A', text: 'AI systems are too slow' },
            { id: 'B', text: 'Bias in training data leading to unfair outcomes' },
            { id: 'C', text: 'AI requires internet connection' },
            { id: 'D', text: 'AI is too expensive' }
          ],
          correct_answer: 'B',
          points: 10,
          domain: 'ethics',
          explanation: 'Bias in AI systems is a major ethical concern as it can perpetuate and amplify existing societal biases.'
        },
        {
          id: 'q3',
          text: 'What is a neural network?',
          options: [
            { id: 'A', text: 'A computer network for sharing files' },
            { id: 'B', text: 'A biological brain structure' },
            { id: 'C', text: 'A computing system inspired by biological neural networks' },
            { id: 'D', text: 'A type of internet protocol' }
          ],
          correct_answer: 'C',
          points: 10,
          domain: 'technical',
          explanation: 'Neural networks are computing systems inspired by the biological neural networks in animal brains.'
        }
      ],
      timeLimit: 30,
      passingScore: 70,
      allowSkip: false
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'assessment_002',
    type: 'assessment',
    code: 'ai-applications',
    title: 'AI Applications Assessment',
    description: 'Evaluate your knowledge of practical AI applications in various industries',
    objectives: [
      'Identify AI applications in different sectors',
      'Understand AI implementation challenges',
      'Evaluate AI solution effectiveness'
    ],
    prerequisites: ['AI Literacy Foundation'],
    metadata: {
      questions: [
        {
          id: 'q1',
          text: 'Which industry has NOT significantly adopted AI?',
          options: [
            { id: 'A', text: 'Healthcare' },
            { id: 'B', text: 'Finance' },
            { id: 'C', text: 'None - all industries are adopting AI' },
            { id: 'D', text: 'Agriculture' }
          ],
          correct_answer: 'C',
          points: 10,
          domain: 'applications'
        }
      ],
      timeLimit: 45,
      passingScore: 75
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];