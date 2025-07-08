/**
 * Discovery Service V2
 * Implements single-program structure for exploration-based learning
 */

import { BaseLearningServiceV2 } from './base-learning-service';
import { ScenarioWithHierarchy, DiscoveryStartOptions, Task, Scenario } from '../types';
import { DatabaseConnection } from '../utils/database';

export class DiscoveryServiceV2 extends BaseLearningServiceV2 {
  constructor(db: DatabaseConnection) {
    super(db);
  }

  getServiceName(): string {
    return 'Discovery Service';
  }

  getDefaultStructureType(): 'standard' | 'direct_task' | 'single_program' {
    return 'standard'; // Discovery 使用標準的多 Program 結構
  }

  /**
   * Start a discovery scenario with career exploration programs
   */
  async startDiscovery(options: DiscoveryStartOptions): Promise<ScenarioWithHierarchy> {
    // Create scenario with multiple program structure for different career experiences
    const scenario = await this.createScenario(
      {
        code: `discovery_${Date.now()}`,
        title: `Exploring ${options.topic} Career`,
        description: `Experience different scenarios in ${options.topic} career path`,
        structure_type: 'standard',
        order_index: 0,
        is_active: true,
        metadata: {
          career: options.topic,
          language: options.language,
          difficulty: options.difficulty || 'beginner',
          user_context: options.user_context,
          discovery_type: 'career_exploration',
          total_scenarios: 3
        }
      },
      {
        structure_type: 'standard',
        programs: await this.generateCareerScenarios(options)
      }
    );

    return scenario;
  }

  /**
   * Generate career exploration scenarios (programs)
   */
  private async generateCareerScenarios(
    options: DiscoveryStartOptions
  ): Promise<Array<{
    title: string;
    description: string;
    order_index: number;
    tasks: Array<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>>;
  }>> {
    const career = options.topic;
    
    return [
      {
        title: `Day in the Life of a ${career}`,
        description: `Experience typical daily activities and responsibilities`,
        order_index: 0,
        tasks: await this.generateScenarioTasks(career, 'daily_routine')
      },
      {
        title: `${career} Challenge Scenario`,
        description: `Handle a challenging situation that tests your skills`,
        order_index: 1,
        tasks: await this.generateScenarioTasks(career, 'challenge')
      },
      {
        title: `${career} Career Growth`,
        description: `Explore advancement opportunities and career decisions`,
        order_index: 2,
        tasks: await this.generateScenarioTasks(career, 'career_growth')
      }
    ];
  }

  /**
   * Generate tasks for a specific scenario
   */
  private async generateScenarioTasks(
    career: string,
    scenarioType: 'daily_routine' | 'challenge' | 'career_growth'
  ): Promise<Array<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>>> {
    // This would be dynamically generated based on career and scenario
    // For now, returning template tasks
    return this.getScenarioTaskTemplates(career, scenarioType);
  }

  /**
   * [Deprecated] Generate discovery tasks based on topic and context
   */
  private async generateDiscoveryTasks(
    options: DiscoveryStartOptions
  ): Promise<Array<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>>> {
    // In a real implementation, this would call an AI service to generate tasks
    // For now, we'll create a template structure
    const difficulty = options.difficulty || 'beginner';
    
    return [
      {
        code: 'explore_basics',
        title: `Understanding ${options.topic}`,
        description: `Let's start by exploring the fundamental concepts of ${options.topic}`,
        instructions: `In this exploration task, we'll discover:
1. What is ${options.topic}?
2. Why is it important?
3. How does it relate to your interests?

Feel free to ask questions and explore at your own pace.`,
        task_type: 'learning',
        task_variant: 'exploration',
        order_index: 0,
        is_active: true,
        metadata: {
          ai_modules: ['exploration_guide', 'concept_explainer'],
          exploration_type: 'guided',
          estimated_duration: 15
        }
      },
      {
        code: 'hands_on_practice',
        title: `Hands-on with ${options.topic}`,
        description: `Apply what you've learned through interactive practice`,
        instructions: `Now let's put your understanding into practice:
1. Try out a simple example
2. Experiment with different approaches
3. See what happens when you change things

The AI will guide you through each step.`,
        task_type: 'practice',
        task_variant: 'exploration',
        order_index: 1,
        is_active: true,
        metadata: {
          ai_modules: ['practice_assistant', 'feedback_provider'],
          exploration_type: 'interactive',
          estimated_duration: 20
        }
      },
      {
        code: 'reflection',
        title: `Reflecting on Your ${options.topic} Journey`,
        description: `Consolidate your learning and plan next steps`,
        instructions: `Let's reflect on what you've discovered:
1. What surprised you most?
2. What would you like to explore further?
3. How might you apply this knowledge?

Share your thoughts and get personalized recommendations.`,
        task_type: 'assessment',
        task_variant: 'exploration',
        order_index: 2,
        is_active: true,
        metadata: {
          ai_modules: ['reflection_guide', 'recommendation_engine'],
          exploration_type: 'reflective',
          estimated_duration: 10
        }
      }
    ];
  }

  /**
   * Continue discovery with new topic branch
   */
  async branchDiscovery(
    scenarioId: string,
    newTopic: string,
    context?: string
  ): Promise<ScenarioWithHierarchy> {
    const originalScenario = await this.getScenarioWithHierarchy(scenarioId);
    if (!originalScenario) throw new Error('Original scenario not found');

    // Create a new discovery branch
    return this.startDiscovery({
      topic: newTopic,
      language: originalScenario.metadata?.language || 'en',
      difficulty: originalScenario.metadata?.difficulty,
      user_context: context || `Branching from exploration of ${originalScenario.metadata?.topic}`
    });
  }

  /**
   * Get scenario task templates
   */
  private getScenarioTaskTemplates(
    career: string,
    scenarioType: 'daily_routine' | 'challenge' | 'career_growth'
  ): Array<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>> {
    const templates: Record<string, Array<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'program_id'>>> = {
      daily_routine: [
        {
          code: 'morning_briefing',
          title: 'Morning Team Briefing',
          description: 'Start your day with the team standup meeting',
          instructions: `Participate in the morning briefing, understand today's priorities, and plan your tasks.`,
          task_type: 'learning',
          task_variant: 'exploration',
          order_index: 0,
          is_active: true,
          metadata: {
            scenario_type: 'daily_routine',
            interaction_type: 'meeting',
            estimated_duration: 10
          }
        },
        {
          code: 'core_work',
          title: `Core ${career} Task`,
          description: `Work on a typical task for this role`,
          instructions: `Complete a real work task that ${career}s handle daily. Make decisions and see their impact.`,
          task_type: 'practice',
          task_variant: 'exploration',
          order_index: 1,
          is_active: true,
          metadata: {
            scenario_type: 'daily_routine',
            interaction_type: 'hands_on',
            estimated_duration: 20
          }
        }
      ],
      challenge: [
        {
          code: 'crisis_brief',
          title: 'Urgent Situation Briefing',
          description: 'Understand the crisis or challenge at hand',
          instructions: 'Review the situation, identify key issues, and prepare your response strategy.',
          task_type: 'learning',
          task_variant: 'exploration',
          order_index: 0,
          is_active: true,
          metadata: {
            scenario_type: 'challenge',
            difficulty: 'high',
            estimated_duration: 15
          }
        },
        {
          code: 'problem_solving',
          title: 'Develop Solution Strategy',
          description: 'Create and implement a solution',
          instructions: 'Use your skills to develop a comprehensive solution. Consider multiple approaches.',
          task_type: 'practice',
          task_variant: 'exploration',
          order_index: 1,
          is_active: true,
          metadata: {
            scenario_type: 'challenge',
            skill_focus: 'problem_solving',
            estimated_duration: 25
          }
        }
      ],
      career_growth: [
        {
          code: 'career_options',
          title: 'Explore Career Paths',
          description: 'Discover different growth opportunities',
          instructions: 'Explore various career advancement options available for experienced professionals.',
          task_type: 'learning',
          task_variant: 'exploration',
          order_index: 0,
          is_active: true,
          metadata: {
            scenario_type: 'career_growth',
            focus: 'opportunities',
            estimated_duration: 15
          }
        },
        {
          code: 'career_decision',
          title: 'Make a Career Decision',
          description: 'Choose your next career move',
          instructions: 'Based on your exploration, make a decision about your career direction.',
          task_type: 'practice',
          task_variant: 'exploration',
          order_index: 1,
          is_active: true,
          metadata: {
            scenario_type: 'career_growth',
            decision_type: 'career_path',
            estimated_duration: 15
          }
        }
      ]
    };

    return templates[scenarioType] || [];
  }

  /**
   * Get all discovery sessions for a user
   */
  async getUserDiscoverySessions(userId: string): Promise<Scenario[]> {
    const scenarios = await this.getScenariosByStructureType('standard');
    // In a real implementation, filter by user
    return scenarios.filter(s => s.metadata?.discovery_type === 'career_exploration');
  }

  /**
   * Add a follow-up task to existing discovery
   */
  async addFollowUpTask(
    scenarioId: string,
    taskData: {
      title: string;
      description: string;
      type: 'deeper_dive' | 'related_topic' | 'challenge';
    }
  ): Promise<Task> {
    const scenario = await this.getScenarioWithHierarchy(scenarioId);
    if (!scenario || scenario.programs.length === 0) {
      throw new Error('Scenario or program not found');
    }

    const program = scenario.programs[0]; // Single program structure
    const existingTaskCount = program.tasks.length;

    return this.createTask(program.id, {
      code: `followup_${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      instructions: this.generateFollowUpInstructions(taskData.type),
      task_type: taskData.type === 'challenge' ? 'assessment' : 'learning',
      task_variant: 'exploration',
      order_index: existingTaskCount,
      is_active: true,
      metadata: {
        followup_type: taskData.type,
        ai_modules: this.getAIModulesForFollowUp(taskData.type)
      }
    });
  }

  private generateFollowUpInstructions(type: string): string {
    switch (type) {
      case 'deeper_dive':
        return 'Let\'s explore this concept in more detail...';
      case 'related_topic':
        return 'Here\'s how this connects to related concepts...';
      case 'challenge':
        return 'Ready for a challenge? Let\'s test your understanding...';
      default:
        return 'Continue your exploration...';
    }
  }

  private getAIModulesForFollowUp(type: string): string[] {
    switch (type) {
      case 'deeper_dive':
        return ['deep_explainer', 'example_generator'];
      case 'related_topic':
        return ['connection_mapper', 'concept_linker'];
      case 'challenge':
        return ['challenge_creator', 'hint_provider'];
      default:
        return ['exploration_guide'];
    }
  }
}