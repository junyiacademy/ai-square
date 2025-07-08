/**
 * Discovery Service Implementation for V2
 * Handles career exploration with dynamic task generation
 */

import { BaseLearningService, ServiceContext } from './base.service';
import { 
  SourceContent, 
  Scenario, 
  Program, 
  Task, 
  Log, 
  Evaluation 
} from '@/lib/v2/interfaces/base';

export class DiscoveryService extends BaseLearningService {
  /**
   * Create initial programs for Discovery scenario
   * Discovery uses programs to represent different career scenarios
   */
  protected async createInitialPrograms(
    scenario: Scenario,
    source: SourceContent,
    context: ServiceContext
  ): Promise<void> {
    // Discovery programs represent different career scenarios
    const careerScenarios = [
      {
        id: 'daily_routine',
        title: `Day in the Life of ${source.title}`,
        description: 'Experience typical daily activities and responsibilities',
        scenario_type: 'daily'
      },
      {
        id: 'challenge',
        title: `${source.title} Challenge Scenario`,
        description: 'Handle real-world challenges and problem-solving',
        scenario_type: 'challenge'
      },
      {
        id: 'growth',
        title: `${source.title} Career Growth`,
        description: 'Explore career advancement and skill development',
        scenario_type: 'growth'
      }
    ];

    for (let i = 0; i < careerScenarios.length; i++) {
      const careerScenario = careerScenarios[i];
      
      // Create program for this scenario
      const program = await this.repositories.program.create({
        scenario_id: scenario.id,
        title: careerScenario.title,
        description: careerScenario.description,
        program_order: i,
        status: i === 0 ? 'active' : 'pending',
        config: {
          scenario_type: careerScenario.scenario_type,
          career: source.title,
          is_expandable: true
        },
        metadata: {
          xp_awarded: 0,
          tasks_generated: 0,
          branches_explored: 0
        },
        ...(i === 0 && { started_at: new Date().toISOString() })
      });

      // Generate initial tasks for this scenario
      const initialTasks = await this.generateInitialTasks(
        source.title,
        careerScenario.scenario_type
      );
      
      for (let j = 0; j < initialTasks.length; j++) {
        const taskDef = initialTasks[j];
        
        await this.repositories.task.create({
          program_id: program.id,
          title: taskDef.title,
          description: taskDef.description,
          instructions: taskDef.instructions,
          task_order: j,
          type: taskDef.type || 'chat',
          required_ksa: taskDef.required_ksa || [],
          config: {
            xp_reward: taskDef.xp_reward || 10,
            badges: taskDef.badges || []
          },
          metadata: {
            can_branch: true,
            is_generated: true,
            generation_context: careerScenario.scenario_type
          },
          status: j === 0 && i === 0 ? 'active' : 'pending'
        });
      }
    }
  }

  /**
   * Generate initial tasks based on career and scenario type
   */
  private async generateInitialTasks(career: string, scenarioType: string): Promise<any[]> {
    // In real implementation, this would use AI to generate tasks
    // For now, return template tasks
    const taskTemplates: Record<string, any[]> = {
      daily: [
        {
          title: 'Morning Briefing',
          description: `Start your day as a ${career}`,
          instructions: 'Review your daily priorities and plan your approach',
          type: 'chat',
          xp_reward: 10
        },
        {
          title: 'Team Collaboration',
          description: 'Work with your team on current projects',
          instructions: 'Participate in team discussions and contribute ideas',
          type: 'discussion',
          xp_reward: 15
        }
      ],
      challenge: [
        {
          title: 'Crisis Management',
          description: 'Handle an unexpected situation',
          instructions: 'Analyze the problem and propose solutions',
          type: 'submission',
          xp_reward: 25
        },
        {
          title: 'Decision Making',
          description: 'Make critical decisions under pressure',
          instructions: 'Evaluate options and justify your choices',
          type: 'chat',
          xp_reward: 20
        }
      ],
      growth: [
        {
          title: 'Skill Assessment',
          description: 'Evaluate your current skills and identify gaps',
          instructions: 'Reflect on your strengths and areas for improvement',
          type: 'submission',
          xp_reward: 15
        },
        {
          title: 'Career Planning',
          description: 'Plan your career trajectory',
          instructions: 'Set goals and create an action plan',
          type: 'submission',
          xp_reward: 20
        }
      ]
    };

    return taskTemplates[scenarioType] || taskTemplates.daily;
  }

  /**
   * Evaluate Discovery task response with flexible criteria
   */
  protected async evaluateResponse(
    task: Task,
    response: any,
    log: Log
  ): Promise<Evaluation> {
    // Discovery uses more flexible evaluation
    const evaluationResult = await this.aiService?.evaluateTaskResponse({
      task: task,
      response: response,
      rubric: {
        engagement: 'How engaged and thoughtful is the response?',
        relevance: 'How relevant is the response to the career context?',
        creativity: 'How creative or insightful is the approach?'
      },
      required_ksa: task.required_ksa
    }) || {
      scores: { 
        overall: 75,
        engagement: 75,
        relevance: 75,
        creativity: 75
      },
      feedback: {
        summary: 'Good exploration of the career scenario',
        strengths: ['Thoughtful response'],
        improvements: ['Consider more perspectives']
      }
    };

    // Award XP based on performance
    const xpEarned = Math.floor((evaluationResult.scores.overall / 100) * (task.config.xp_reward || 10));
    
    // Update program XP
    const program = await this.repositories.program.findById(task.program_id);
    if (program) {
      await this.repositories.program.update(program.id, {
        metadata: {
          ...program.metadata,
          xp_awarded: (program.metadata.xp_awarded || 0) + xpEarned
        }
      });
    }

    // Create evaluation record
    return await this.repositories.evaluation.create({
      log_id: log.id,
      scenario_id: log.scenario_id,
      task_id: task.id,
      evaluation_type: 'ai',
      input: { response: response },
      result: {
        ...evaluationResult,
        xp_earned: xpEarned
      },
      scores: evaluationResult.scores,
      feedback: evaluationResult.feedback,
      ksa_mapping: evaluationResult.ksa_achievement,
      evaluated_by: `ai:${this.aiService?.getModelInfo().model || 'unknown'}`
    });
  }

  /**
   * Discovery-specific: Add dynamic task based on user interest
   */
  async addDynamicTask(
    programId: string,
    userRequest: string,
    userId: string
  ): Promise<Task> {
    const program = await this.repositories.program.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    // Get existing tasks to maintain order
    const existingTasks = await this.repositories.task.findByProgram(programId);
    
    // Generate new task using AI
    const newTaskDef = await this.aiService?.generateTask({
      career: program.config.career,
      scenario_type: program.config.scenario_type,
      existing_tasks: existingTasks,
      user_interest: userRequest
    }) || {
      title: `Explore: ${userRequest}`,
      description: `Dive deeper into ${userRequest} as a ${program.config.career}`,
      instructions: 'Explore this aspect of the career based on your interests',
      type: 'chat'
    };

    // Create the task
    const task = await this.repositories.task.create({
      program_id: programId,
      title: newTaskDef.title,
      description: newTaskDef.description,
      instructions: newTaskDef.instructions,
      task_order: existingTasks.length,
      type: newTaskDef.type as Task['type'] || 'chat',
      required_ksa: [],
      config: {
        xp_reward: 15,
        generated_from: userRequest
      },
      metadata: {
        is_generated: true,
        generation_context: userRequest,
        generated_at: new Date().toISOString()
      },
      status: 'active'
    });

    // Update program metadata
    await this.repositories.program.update(programId, {
      metadata: {
        ...program.metadata,
        tasks_generated: (program.metadata.tasks_generated || 0) + 1
      }
    });

    // Log the dynamic task creation
    await this.logActivity({
      scenario_id: program.scenario_id,
      program_id: programId,
      task_id: task.id,
      user_id: userId,
      log_type: 'completion',
      activity: 'dynamic_task_created',
      data: {
        user_request: userRequest,
        generated_task: task.title
      }
    });

    return task;
  }

  /**
   * Discovery-specific: Branch to explore new career direction
   */
  async branchExploration(
    scenarioId: string,
    newDirection: string,
    userId: string
  ): Promise<Program> {
    const programs = await this.repositories.program.findByScenario(scenarioId);
    const maxOrder = Math.max(...programs.map(p => p.program_order));
    
    // Create new program branch
    const program = await this.repositories.program.create({
      scenario_id: scenarioId,
      title: `Exploring: ${newDirection}`,
      description: `A new direction in your career exploration journey`,
      program_order: maxOrder + 1,
      status: 'active',
      config: {
        branch_type: 'user_initiated',
        branch_topic: newDirection,
        is_expandable: true
      },
      metadata: {
        xp_awarded: 0,
        tasks_generated: 0,
        parent_programs: programs.map(p => p.id)
      },
      started_at: new Date().toISOString()
    });

    // Generate initial tasks for this branch
    const initialTasks = await this.aiService?.generateTask({
      career: programs[0]?.config.career || 'Professional',
      scenario_type: 'exploration',
      existing_tasks: [],
      user_interest: newDirection
    }) || {
      title: `Introduction to ${newDirection}`,
      description: `Begin exploring ${newDirection}`,
      instructions: 'Start your exploration journey',
      type: 'chat'
    };

    // Create first task
    await this.repositories.task.create({
      program_id: program.id,
      title: initialTasks.title,
      description: initialTasks.description,
      instructions: initialTasks.instructions,
      task_order: 0,
      type: 'chat',
      required_ksa: [],
      config: { xp_reward: 20 },
      metadata: {
        is_branch_start: true,
        branch_topic: newDirection
      },
      status: 'active'
    });

    // Log branch creation
    await this.logActivity({
      scenario_id: scenarioId,
      program_id: program.id,
      user_id: userId,
      log_type: 'completion',
      activity: 'exploration_branched',
      data: {
        branch_direction: newDirection,
        new_program: program.title
      }
    });

    return program;
  }

  /**
   * Discovery-specific: Get exploration summary
   */
  async getExplorationSummary(scenarioId: string): Promise<{
    career_explored: string;
    total_xp: number;
    tasks_completed: number;
    branches_explored: number;
    badges_earned: string[];
    insights: string[];
  }> {
    const scenario = await this.repositories.scenario.findById(scenarioId);
    const programs = await this.repositories.program.findByScenario(scenarioId);
    const evaluations = await this.repositories.evaluation.findByScenario(scenarioId);
    
    // Calculate totals
    const totalXP = programs.reduce((sum, p) => sum + (p.metadata.xp_awarded || 0), 0);
    const branchesExplored = programs.filter(p => p.config.branch_type === 'user_initiated').length;
    
    // Count completed tasks
    let tasksCompleted = 0;
    for (const program of programs) {
      tasksCompleted += await this.repositories.task.countByStatus(program.id, 'completed');
    }
    
    // Extract badges (would be stored in evaluations or tasks)
    const badges: string[] = [];
    
    // Generate insights based on exploration
    const insights = [
      `Explored ${programs.length} different career scenarios`,
      `Demonstrated strong interest in ${branchesExplored > 0 ? 'diverse aspects' : 'core responsibilities'}`,
      `Average performance score: ${Math.round(evaluations.reduce((sum, e) => sum + (e.scores.overall || 0), 0) / evaluations.length)}%`
    ];
    
    return {
      career_explored: scenario?.metadata.source_code || 'Unknown Career',
      total_xp: totalXP,
      tasks_completed: tasksCompleted,
      branches_explored: branchesExplored,
      badges_earned: badges,
      insights: insights
    };
  }
}