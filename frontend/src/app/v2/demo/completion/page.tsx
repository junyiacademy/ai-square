'use client';

import { useState } from 'react';
import { CompletionInterface } from '@/lib/v2/components/CompletionInterface';
import { SpecializedCompletionUI } from '@/lib/v2/components/SpecializedCompletionUI';

export default function CompletionDemoPage() {
  const [selectedType, setSelectedType] = useState<'assessment' | 'pbl' | 'discovery'>('assessment');
  const [showSpecialized, setShowSpecialized] = useState(true);

  // Mock data for unified version
  const mockBaseData = {
    completedAt: new Date(),
    timeSpent: 1800, // 30 minutes
    tasksCompleted: 8,
    totalTasks: 10,
    completionRate: 80,
    overallScore: 85,
    performance: 'good' as const,
    domainScores: {
      engaging_with_ai: 78,
      creating_with_ai: 82,
      managing_with_ai: 75,
      designing_with_ai: 88
    },
    ksaScores: {
      knowledge: 82,
      skills: 78,
      attitudes: 85
    },
    ksaDemonstrated: {
      knowledge: [
        {
          code: 'K1.1',
          name: 'The Nature of AI',
          description: 'AI systems process data through algorithms to recognize patterns, make predictions, and generate outputs without explicit programming for each specific task.',
          competencies: ['engaging_with_ai', 'creating_with_ai'],
          mastery: 2, // Green - fully demonstrated
          correct: 2,
          total: 2,
          tasks: ['task-k1-1', 'task-k1-2']
        },
        {
          code: 'K1.2',
          name: 'The Nature of AI',
          description: 'AI systems vary in complexity and capability, from simple rule-based systems to advanced machine learning models that can adapt and improve through experience.',
          competencies: ['engaging_with_ai', 'designing_with_ai'],
          mastery: 2, // Green
          correct: 1,
          total: 1,
          tasks: ['task-k1-2']
        },
        {
          code: 'K2.1',
          name: 'AI Reflects Human Choices and Perspectives',
          description: 'Building and maintaining AI systems relies on humans to design algorithms, collect and label data, and moderate harmful content.',
          competencies: ['managing_with_ai', 'designing_with_ai'],
          mastery: 1, // Yellow - partially demonstrated
          correct: 1,
          total: 2,
          tasks: ['task-k2-1a', 'task-k2-1b']
        },
        {
          code: 'K3.1',
          name: 'AI Reshapes Work and Human Roles',
          description: 'AI systems automate structured tasks, augment decision-making, and transform industries, requiring humans to adapt, reskill, and upskill.',
          competencies: ['managing_with_ai', 'creating_with_ai'],
          mastery: 2, // Green
          correct: 1,
          total: 1,
          tasks: ['task-k3-1']
        },
        {
          code: 'K4.2',
          name: 'AIs Capabilities and Limitations',
          description: 'AI requires vast amounts of computing power and data, which consumes energy, thus demanding limited natural resources and increasing carbon emissions.',
          competencies: ['managing_with_ai', 'designing_with_ai'],
          mastery: 0, // Red - not demonstrated
          correct: 0,
          total: 1,
          tasks: ['task-k4-2']
        }
      ],
      skills: [
        {
          code: 'S1.1',
          name: 'Critical Thinking',
          description: 'Evaluate AI-generated content for accuracy, fairness, and bias to make informed and ethical decisions.',
          competencies: ['engaging_with_ai', 'creating_with_ai'],
          mastery: 2, // Green
          correct: 2,
          total: 2,
          tasks: ['task-s1-1a', 'task-s1-1b']
        },
        {
          code: 'S2.1',
          name: 'Creativity',
          description: 'Collaborate with AI to create and refine original ideas while considering issues of ownership, attribution, and responsible use.',
          competencies: ['engaging_with_ai', 'managing_with_ai'],
          mastery: 1, // Yellow
          correct: 1,
          total: 2,
          tasks: ['task-s2-1a', 'task-s2-1b']
        },
        {
          code: 'S3.1',
          name: 'Computational Thinking',
          description: 'Decompose problems and provide instructions in ways that allow AI systems to effectively contribute to solutions.',
          competencies: ['managing_with_ai', 'designing_with_ai'],
          mastery: 2, // Green
          correct: 1,
          total: 1,
          tasks: []
        },
        {
          code: 'S5.1',
          name: 'Problem Solving',
          description: 'Determine when and how to use AI for a task by assessing its capabilities, risks, and ethical implications.',
          competencies: ['managing_with_ai', 'creating_with_ai'],
          mastery: 1, // Yellow
          correct: 2,
          total: 3,
          tasks: []
        }
      ],
      attitudes: [
        {
          code: 'A1.1',
          name: 'Responsible',
          description: 'Be accountable; seek to prevent harm from AI use.',
          competencies: ['engaging_with_ai', 'managing_with_ai'],
          mastery: 2, // Green
          correct: 3,
          total: 3,
          tasks: []
        },
        {
          code: 'A2.1',
          name: 'Curious',
          description: 'Explore AI capabilities and limitations with openness.',
          competencies: ['creating_with_ai', 'managing_with_ai'],
          mastery: 2, // Green
          correct: 2,
          total: 2,
          tasks: []
        },
        {
          code: 'A3.1',
          name: 'Innovative',
          description: 'Pursue novel, positive applications of AI.',
          competencies: ['managing_with_ai', 'designing_with_ai'],
          mastery: 1, // Yellow
          correct: 1,
          total: 2,
          tasks: []
        },
        {
          code: 'A4.1',
          name: 'Adaptable',
          description: 'Iterate flexibly with feedback and new contexts.',
          competencies: ['designing_with_ai', 'creating_with_ai'],
          mastery: 2, // Green
          correct: 2,
          total: 2,
          tasks: []
        },
        {
          code: 'A4.2',
          name: 'Adaptable',
          description: 'Consider diverse perspectives and potential impacts on different groups when working with AI.',
          competencies: ['designing_with_ai', 'managing_with_ai'],
          mastery: 2, // Green
          correct: 1,
          total: 1,
          tasks: []
        }
      ]
    },
    keyAchievements: [
      'Successfully demonstrated understanding of AI fundamentals',
      'Completed all required tasks within time limit',
      'Showed strong analytical thinking skills',
      'Achieved above-average score in critical thinking'
    ],
    skillsDeveloped: [
      'AI Literacy',
      'Critical Thinking',
      'Problem Solving',
      'Data Analysis',
      'Ethical Reasoning'
    ],
    nextSteps: [
      'Review areas where you scored below 70% for improvement',
      'Explore advanced AI concepts in the next module',
      'Practice applying AI tools in real-world scenarios',
      'Join the AI learning community for peer discussions'
    ],
    recommendedActions: [
      {
        label: 'View Detailed Results',
        action: () => console.log('View results'),
        variant: 'primary' as const
      },
      {
        label: 'Continue Learning',
        action: () => console.log('Continue learning'),
        variant: 'secondary' as const
      }
    ]
  };

  // Mock tasks data for TaskReview
  const mockTasks = [
    {
      id: 'task-k1-1',
      title: 'AI Fundamentals Quiz Question 1',
      type: 'question' as const,
      content: 'Which of the following best describes machine learning?',
      options: {
        a: 'A type of computer hardware designed for AI',
        b: 'A method for computers to learn patterns from data without explicit programming',
        c: 'A programming language specifically for AI development',
        d: 'A database system for storing AI models'
      },
      correct_answer: 'b',
      explanation: 'Machine learning is a subset of AI that enables computers to learn and make decisions from data without being explicitly programmed for every task.',
      userResponse: 'b',
      isCorrect: true,
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: 'task-k1-2',
      title: 'AI Fundamentals Quiz Question 2',
      type: 'question' as const,
      content: 'What is the main difference between supervised and unsupervised learning?',
      options: {
        a: 'Supervised learning uses labeled data, unsupervised learning does not',
        b: 'Supervised learning is faster than unsupervised learning',
        c: 'Supervised learning works with text, unsupervised with images',
        d: 'There is no significant difference between them'
      },
      correct_answer: 'a',
      explanation: 'Supervised learning requires labeled training data where the correct answers are provided, while unsupervised learning finds patterns in data without labels.',
      userResponse: 'a',
      isCorrect: true,
      timestamp: new Date(Date.now() - 3500000)
    },
    {
      id: 'task-k2-1a',
      title: 'AI Ethics Discussion',
      type: 'conversation' as const,
      content: 'Discussed the role of human oversight in AI system development and deployment, focusing on bias mitigation and fairness.',
      userResponse: 'I believe human oversight is crucial because AI systems can perpetuate biases present in training data. Humans need to continuously monitor and adjust AI systems to ensure fair outcomes across different demographic groups.',
      timestamp: new Date(Date.now() - 3000000),
      metadata: {
        turns: 8,
        duration: 1200
      }
    },
    {
      id: 'task-k2-1b',
      title: 'Bias Detection Exercise',
      type: 'question' as const,
      content: 'A hiring AI system shows a 20% lower acceptance rate for female candidates. What should be the immediate response?',
      options: {
        a: 'Continue using the system as it must be finding real differences',
        b: 'Immediately investigate the training data and model for gender bias',
        c: 'Adjust the threshold to equalize acceptance rates',
        d: 'Switch to a different AI vendor'
      },
      correct_answer: 'b',
      explanation: 'When bias is detected, the first step should be investigating the root cause in the training data and model architecture before making adjustments.',
      userResponse: 'c',
      isCorrect: false,
      timestamp: new Date(Date.now() - 2800000)
    },
    {
      id: 'task-k3-1',
      title: 'Future of Work Reflection',
      type: 'reflection' as const,
      content: 'Reflect on how AI might change your current or desired profession in the next 5-10 years.',
      userResponse: 'As a product manager, I see AI transforming my role by automating data analysis and providing insights that help with decision-making. However, the human skills of empathy, strategic thinking, and stakeholder communication will become even more valuable as AI handles routine tasks.',
      timestamp: new Date(Date.now() - 2400000)
    },
    {
      id: 'task-k4-2',
      title: 'AI Environmental Impact Assessment',
      type: 'task' as const,
      content: 'Calculate the approximate carbon footprint of training a large language model and propose mitigation strategies.',
      userResponse: 'Based on research, training GPT-3 consumed approximately 1,287 MWh of energy, equivalent to about 552 tons of CO2. Mitigation strategies include: 1) Using renewable energy sources for data centers, 2) Optimizing model architectures for efficiency, 3) Sharing pre-trained models to reduce redundant training, 4) Implementing carbon offset programs.',
      timestamp: new Date(Date.now() - 2000000),
      metadata: {
        score: 65
      }
    },
    {
      id: 'task-s1-1a',
      title: 'Critical Thinking Exercise 1',
      type: 'question' as const,
      content: 'An AI system claims 95% accuracy. Which additional information is most important to evaluate this claim?',
      options: {
        a: 'The size of the training dataset',
        b: 'The test dataset composition and evaluation metrics used',
        c: 'The computational resources required',
        d: 'The programming language used'
      },
      correct_answer: 'b',
      explanation: 'Understanding what was tested and how provides context for the accuracy claim - different datasets and metrics can dramatically affect results.',
      userResponse: 'b',
      isCorrect: true,
      timestamp: new Date(Date.now() - 1800000)
    },
    {
      id: 'task-s1-1b',
      title: 'Critical Thinking Exercise 2',
      type: 'question' as const,
      content: 'What is the most reliable way to verify AI-generated content?',
      options: {
        a: 'Check if it looks professionally written',
        b: 'Cross-reference with multiple authoritative sources',
        c: 'Look for grammar and spelling errors',
        d: 'Check the confidence score of the AI'
      },
      correct_answer: 'b',
      explanation: 'Cross-referencing with authoritative sources is the most reliable method to verify accuracy and detect potential hallucinations.',
      userResponse: 'b',
      isCorrect: true,
      timestamp: new Date(Date.now() - 1600000)
    },
    {
      id: 'task-s2-1a',
      title: 'Creative AI Collaboration',
      type: 'conversation' as const,
      content: 'Collaborated with an AI writing assistant to create an original short story while maintaining creative control.',
      userResponse: 'I used the AI to brainstorm initial ideas and help with dialogue, but I maintained control over the plot, character development, and themes. The collaboration felt more like having a creative partner than using a tool.',
      timestamp: new Date(Date.now() - 1400000),
      metadata: {
        turns: 12,
        duration: 1800
      }
    },
    {
      id: 'task-s2-1b',
      title: 'Attribution and Ownership Discussion',
      type: 'question' as const,
      content: 'When using AI to assist in creative work, what is the most ethical approach to attribution?',
      options: {
        a: 'No attribution needed if you edited the AI output',
        b: 'Always clearly disclose AI assistance and your role in the creation',
        c: 'Only mention AI use if it contributed more than 50%',
        d: 'Attribution depends on the specific AI tool used'
      },
      correct_answer: 'b',
      explanation: 'Transparency about AI assistance maintains trust and allows others to understand the creative process.',
      userResponse: 'a',
      isCorrect: false,
      timestamp: new Date(Date.now() - 1200000)
    }
  ];

  // Mock data for specialized versions
  const mockAssessmentData = {
    ...mockBaseData,
    tasks: mockTasks, // Add tasks for TaskReview
    // Assessment-specific
    level: 'intermediate' as const,
    correctAnswers: 8,
    totalQuestions: 10,
    recommendations: [
      'Focus on "Managing with AI" domain - your score of 75% shows room for improvement',
      'Practice more scenarios involving AI ethics and privacy considerations',
      'Strengthen your understanding of AI limitations and bias detection',
      'Consider taking the advanced assessment once you improve weak areas'
    ],
    detailedAnalysis: {
      strengths: [
        'Excellent understanding of AI design principles (88% in Designing with AI)',
        'Strong ethical attitudes towards AI usage',
        'Good grasp of fundamental AI concepts'
      ],
      weaknesses: [
        'Need improvement in managing AI risks and limitations',
        'Could strengthen practical AI tool usage skills'
      ],
      opportunities: [
        'Ready for advanced AI literacy courses',
        'Potential to mentor others in AI design principles',
        'Explore specialized AI applications in your field'
      ]
    }
  };

  const mockPBLData = {
    ...mockBaseData,
    // Override with same detailed KSA data
    ksaDemonstrated: mockBaseData.ksaDemonstrated,
    tasks: mockTasks, // Add tasks for TaskReview
    // PBL-specific
    journeyMilestones: [
      {
        title: 'Understanding the Problem',
        description: 'Analyzed job search challenges and identified AI opportunities',
        completed: true,
        timestamp: new Date(Date.now() - 1800000)
      },
      {
        title: 'Research & Discovery',
        description: 'Explored AI tools for resume optimization and job matching',
        completed: true,
        timestamp: new Date(Date.now() - 1200000)
      },
      {
        title: 'Solution Design',
        description: 'Created AI-powered job search strategy',
        completed: true,
        timestamp: new Date(Date.now() - 600000)
      },
      {
        title: 'Implementation & Testing',
        description: 'Applied AI tools and measured results',
        completed: true,
        timestamp: new Date()
      }
    ],
    problemsSolved: 4,
    collaborationScore: 92,
    appliedConcepts: [
      'Prompt Engineering',
      'AI Tool Selection',
      'Data Privacy',
      'Bias Detection',
      'Result Validation',
      'Iterative Improvement'
    ],
    reflections: [
      'I learned that AI can significantly streamline job search but requires careful prompt crafting',
      'Understanding AI limitations helped me validate results more effectively',
      'Collaboration with AI should be iterative - first results are rarely perfect'
    ]
  };

  const mockDiscoveryData = {
    ...mockBaseData,
    // Override with same detailed KSA data
    ksaDemonstrated: mockBaseData.ksaDemonstrated,
    tasks: mockTasks, // Add tasks for TaskReview
    // Discovery-specific
    careerFit: {
      role: 'AI Product Manager',
      fitScore: 72,
      requiredSkills: [
        'AI Strategy',
        'Product Vision',
        'Stakeholder Management',
        'Data Analysis',
        'User Research',
        'Agile Methodology',
        'Technical Communication',
        'Ethics & Compliance'
      ],
      matchedSkills: [
        'Data Analysis',
        'User Research',
        'Technical Communication',
        'Ethics & Compliance'
      ],
      gaps: [
        'AI Strategy',
        'Product Vision',
        'Stakeholder Management',
        'Agile Methodology'
      ]
    },
    exploredAreas: [
      'AI Product Development Lifecycle',
      'Stakeholder Communication',
      'AI Ethics in Product Design',
      'Market Research with AI Tools',
      'User Experience with AI Features',
      'AI Project Management'
    ],
    interestLevel: 'high' as const,
    pathwayRecommendations: [
      {
        title: 'AI Product Management Fundamentals',
        description: 'Learn core concepts of managing AI-powered products',
        difficulty: 'beginner' as const,
        estimatedTime: '4 weeks'
      },
      {
        title: 'Stakeholder Management for AI Projects',
        description: 'Master communication with technical and non-technical stakeholders',
        difficulty: 'intermediate' as const,
        estimatedTime: '3 weeks'
      },
      {
        title: 'AI Strategy and Roadmapping',
        description: 'Develop strategic thinking for AI product initiatives',
        difficulty: 'advanced' as const,
        estimatedTime: '6 weeks'
      }
    ]
  };

  const scenarios = {
    assessment: {
      title: 'AI Literacy Foundation Assessment',
      program: 'Basic AI Concepts Evaluation'
    },
    pbl: {
      title: 'AI-Powered Job Search Mastery',
      program: 'Foundation - Understanding AI in Job Search'
    },
    discovery: {
      title: 'Exploring AI Product Manager Career',
      program: 'Day in the Life Scenario'
    }
  };

  const getSpecializedData = () => {
    switch (selectedType) {
      case 'assessment':
        return mockAssessmentData;
      case 'pbl':
        return mockPBLData;
      case 'discovery':
        return mockDiscoveryData;
      default:
        return mockBaseData;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Demo Controls */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">Completion UI Demo</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Version:</span>
              <button
                onClick={() => setShowSpecialized(!showSpecialized)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showSpecialized
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {showSpecialized ? 'Specialized' : 'Unified'}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {(['assessment', 'pbl', 'discovery'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'assessment' && 'Assessment'}
                {type === 'pbl' && 'PBL'}
                {type === 'discovery' && 'Discovery'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Completion Interface */}
      {showSpecialized ? (
        <SpecializedCompletionUI
          type={selectedType}
          scenarioTitle={scenarios[selectedType].title}
          programTitle={scenarios[selectedType].program}
          data={getSpecializedData()}
          onClose={() => console.log('Close clicked')}
        />
      ) : (
        <CompletionInterface
          type={selectedType}
          scenarioTitle={scenarios[selectedType].title}
          programTitle={scenarios[selectedType].program}
          data={mockBaseData}
          onClose={() => console.log('Close clicked')}
        />
      )}
    </div>
  );
}