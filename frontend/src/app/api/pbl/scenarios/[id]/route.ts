import { NextResponse } from 'next/server';
import { ScenarioProgram } from '@/types/pbl';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Helper function to load scenario from YAML
interface YAMLScenarioData {
  scenario_info: {
    id: string;
    title: string;
    title_zh?: string;
    description: string;
    description_zh?: string;
    target_domains: string[];
    estimated_duration: number;
    difficulty: string;
    prerequisites: string[];
    learning_objectives: string[];
    learning_objectives_zh?: string[];
  };
  ksa_mapping: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  stages: Array<{
    id: string;
    name: string;
    name_zh?: string;
    description: string;
    description_zh?: string;
    stage_type: string;
    modality_focus: string;
    assessment_focus: {
      primary: string[];
      secondary: string[];
    };
    ai_modules: Array<{
      role: string;
      model: string;
      persona?: string;
      initial_prompt?: string;
    }>;
    tasks: Array<{
      title: string;
      title_zh?: string;
      description: string;
      description_zh?: string;
      instructions: string[];
      instructions_zh?: string[];
      expected_outcome: string;
      expected_outcome_zh?: string;
    }>;
    logging_config: {
      trackInteractions: boolean;
      trackThinkingTime: boolean;
      trackRevisions: boolean;
      trackResourceUsage: boolean;
    };
  }>;
  rubrics_criteria?: Array<{
    criterion: string;
    weight: number;
    levels: Array<{
      level: number;
      description: string;
      criteria: string[];
    }>;
  }>;
}

async function loadScenarioFromYAML(scenarioId: string): Promise<YAMLScenarioData | null> {
  try {
    const yamlPath = path.join(process.cwd(), 'public', 'pbl_data', `${scenarioId}_scenario.yaml`);
    const fileContents = await fs.readFile(yamlPath, 'utf8');
    return yaml.load(fileContents) as YAMLScenarioData;
  } catch (error) {
    console.error(`Error loading scenario ${scenarioId}:`, error);
    return null;
  }
}

// Mock detailed scenario data (fallback)
const mockScenarioDetails: { [key: string]: ScenarioProgram } = {
  'ai-job-search': {
    id: 'ai-job-search',
    title: 'AI-Assisted Job Search Training',
    description: 'Master the art of using AI tools throughout your job search journey',
    targetDomain: ['engaging_with_ai', 'creating_with_ai'],
    ksaMapping: {
      knowledge: ['K1.1', 'K1.2', 'K2.1', 'K2.3'],
      skills: ['S1.1', 'S1.2', 'S2.1', 'S2.3'],
      attitudes: ['A1.1', 'A1.2', 'A2.1']
    },
    stages: [
      {
        id: 'stage-1-research',
        name: 'Job Market Research',
        description: 'Use AI to research job market trends and opportunities',
        stageType: 'research',
        modalityFocus: 'reading',
        assessmentFocus: {
          primary: ['K1.1', 'S1.1'],
          secondary: ['A1.1']
        },
        rubricsCriteria: [],
        aiModules: [
          {
            role: 'assistant',
            model: 'gemini-pro',
            persona: 'Career Research Assistant'
          }
        ],
        tasks: [
          {
            id: 'task-1-1',
            title: 'Industry Analysis',
            description: 'Research current trends in your target industry',
            instructions: [
              'Use AI to identify top 5 trends in your industry',
              'Analyze skill requirements for your target role',
              'Create a summary of opportunities and challenges'
            ],
            expectedOutcome: 'A comprehensive industry analysis report',
            timeLimit: 20,
            resources: ['Industry reports', 'Job boards', 'AI search tools']
          }
        ],
        timeLimit: 30,
        loggingConfig: {
          trackInteractions: true,
          trackThinkingTime: true,
          trackRevisions: false,
          trackResourceUsage: true
        }
      },
      {
        id: 'stage-2-analysis',
        name: 'Resume Optimization',
        description: 'Analyze and optimize your resume with AI assistance',
        stageType: 'analysis',
        modalityFocus: 'writing',
        assessmentFocus: {
          primary: ['K2.1', 'S2.1'],
          secondary: ['A1.2']
        },
        rubricsCriteria: [],
        aiModules: [
          {
            role: 'evaluator',
            model: 'gemini-pro',
            persona: 'Resume Expert'
          }
        ],
        tasks: [
          {
            id: 'task-2-1',
            title: 'Resume Analysis',
            description: 'Get AI feedback on your current resume',
            instructions: [
              'Upload or paste your current resume',
              'Receive AI analysis on strengths and weaknesses',
              'Identify areas for improvement'
            ],
            expectedOutcome: 'Detailed resume analysis report',
            timeLimit: 15
          },
          {
            id: 'task-2-2',
            title: 'Resume Enhancement',
            description: 'Improve your resume based on AI suggestions',
            instructions: [
              'Apply AI suggestions to enhance your resume',
              'Optimize keywords for ATS systems',
              'Ensure clarity and impact in descriptions'
            ],
            expectedOutcome: 'An optimized, ATS-friendly resume',
            timeLimit: 25
          }
        ],
        timeLimit: 40,
        loggingConfig: {
          trackInteractions: true,
          trackThinkingTime: false,
          trackRevisions: true,
          trackResourceUsage: false
        }
      },
      {
        id: 'stage-3-creation',
        name: 'Application Materials',
        description: 'Create compelling cover letters and application materials',
        stageType: 'creation',
        modalityFocus: 'writing',
        assessmentFocus: {
          primary: ['K2.3', 'S2.3'],
          secondary: ['A2.1']
        },
        rubricsCriteria: [],
        aiModules: [
          {
            role: 'assistant',
            model: 'gemini-pro',
            persona: 'Writing Coach'
          }
        ],
        tasks: [
          {
            id: 'task-3-1',
            title: 'Cover Letter Creation',
            description: 'Write a tailored cover letter with AI guidance',
            instructions: [
              'Analyze job description with AI',
              'Draft cover letter with AI suggestions',
              'Refine and personalize the content'
            ],
            expectedOutcome: 'A compelling, tailored cover letter',
            timeLimit: 30
          }
        ],
        timeLimit: 30,
        loggingConfig: {
          trackInteractions: true,
          trackThinkingTime: true,
          trackRevisions: true,
          trackResourceUsage: false
        }
      },
      {
        id: 'stage-4-interaction',
        name: 'Interview Preparation',
        description: 'Practice interviews with AI role-playing',
        stageType: 'interaction',
        modalityFocus: 'speaking',
        assessmentFocus: {
          primary: ['S1.2', 'A1.1'],
          secondary: ['K1.2']
        },
        rubricsCriteria: [],
        aiModules: [
          {
            role: 'actor',
            model: 'gemini-pro',
            persona: 'Interviewer'
          }
        ],
        tasks: [
          {
            id: 'task-4-1',
            title: 'Mock Interview',
            description: 'Practice with an AI interviewer',
            instructions: [
              'Engage in a mock interview with AI',
              'Answer behavioral and technical questions',
              'Receive feedback on your responses'
            ],
            expectedOutcome: 'Improved interview confidence and skills',
            timeLimit: 30
          }
        ],
        timeLimit: 30,
        loggingConfig: {
          trackInteractions: true,
          trackThinkingTime: false,
          trackRevisions: false,
          trackResourceUsage: false
        }
      }
    ],
    estimatedDuration: 90,
    difficulty: 'intermediate',
    prerequisites: ['Basic computer skills', 'Existing resume'],
    learningObjectives: [
      'Master AI-powered job market research techniques',
      'Optimize resume and cover letters using AI tools',
      'Develop interview skills through AI practice',
      'Build confidence in using AI for career advancement'
    ]
  }
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params;
    
    // Try to load from YAML first
    const yamlData = await loadScenarioFromYAML(scenarioId);
    
    let scenario: ScenarioProgram | null = null;
    
    if (yamlData && yamlData.scenario_info) {
      // For now, skip YAML data transformation due to type complexity
      scenario = null;
    } else {
      // Fallback to mock data
      scenario = mockScenarioDetails[scenarioId];
    }

    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SCENARIO_NOT_FOUND',
            message: `Scenario with id '${scenarioId}' not found`
          }
        },
        { status: 404 }
      );
    }

    // Get language from query params
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    // Apply translations if needed
    let translatedScenario = { ...scenario };
    
    // Check if YAML has translations
    if (lang === 'zh-TW' && yamlData && yamlData.scenario_info) {
      translatedScenario = {
        ...scenario,
        title: yamlData.scenario_info.title_zh || scenario.title,
        description: yamlData.scenario_info.description_zh || scenario.description,
        learningObjectives: yamlData.scenario_info.learning_objectives_zh || scenario.learningObjectives,
        stages: scenario.stages.map((stage, index) => {
          const yamlStage = yamlData.stages[index];
          if (yamlStage) {
            return {
              ...stage,
              name: yamlStage.name_zh || stage.name,
              description: yamlStage.description_zh || stage.description,
              tasks: stage.tasks.map((task, taskIndex) => {
                const yamlTask = yamlStage.tasks[taskIndex];
                if (yamlTask) {
                  return {
                    ...task,
                    title: yamlTask.title_zh || task.title,
                    description: yamlTask.description_zh || task.description,
                    instructions: yamlTask.instructions_zh || task.instructions,
                    expectedOutcome: yamlTask.expected_outcome_zh || task.expectedOutcome
                  };
                }
                return task;
              })
            };
          }
          return stage;
        })
      };
    } else if (lang === 'zh-TW' && !yamlData) {
      // Fallback translations for mock data
      if (scenarioId === 'ai-job-search') {
        translatedScenario = {
          ...scenario,
          title: 'AI 輔助求職訓練',
          description: '掌握在求職過程中使用 AI 工具的技巧',
          stages: scenario.stages.map(stage => {
            const translations: { [key: string]: { name: string; description: string } } = {
              'stage-1-research': {
                name: '職缺市場研究',
                description: '使用 AI 研究就業市場趨勢和機會'
              },
              'stage-2-analysis': {
                name: '履歷優化',
                description: '利用 AI 協助分析和優化您的履歷'
              },
              'stage-3-creation': {
                name: '申請材料準備',
                description: '創建引人注目的求職信和申請材料'
              },
              'stage-4-interaction': {
                name: '面試準備',
                description: '與 AI 進行模擬面試練習'
              }
            };
            
            return {
              ...stage,
              ...(translations[stage.id] || {})
            };
          }),
          learningObjectives: [
            '掌握 AI 驅動的就業市場研究技巧',
            '使用 AI 工具優化履歷和求職信',
            '通過 AI 練習提升面試技能',
            '建立使用 AI 促進職業發展的信心'
          ]
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: translatedScenario,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching scenario details:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_SCENARIO_ERROR',
          message: 'Failed to fetch scenario details'
        }
      },
      { status: 500 }
    );
  }
}