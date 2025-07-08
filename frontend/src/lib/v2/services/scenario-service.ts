/**
 * Scenario Service
 * Handles business logic for learning scenarios
 */

import { 
  Scenario, 
  Program, 
  Task, 
  Project,
  UserScenarioProgress,
  UserProgramProgress,
  UserTaskProgress,
  ApiResponse
} from '../types';
import { ScenarioRepositoryV2 } from '../repositories/scenario-repository';
import { ProjectRepositoryV2 } from '../repositories/project-repository';
import { ProgramRepositoryV2 } from '../repositories/program-repository';
import { TaskRepositoryV2 } from '../repositories/task-repository';
import { LogRepositoryV2 } from '../repositories/log-repository';
import { DatabaseConnection, DatabaseFactory } from '../utils/database';

export interface CreateScenarioFromProjectOptions {
  projectId: string;
  userId: string;
  language?: string;
}

export interface ScenarioWithDetails extends Scenario {
  programs: ProgramWithTasks[];
  project?: Project;
}

export interface ProgramWithTasks extends Program {
  tasks: Task[];
}

export class ScenarioService {
  private scenarioRepo: ScenarioRepositoryV2;
  private projectRepo: ProjectRepositoryV2;
  private programRepo: ProgramRepositoryV2;
  private taskRepo: TaskRepositoryV2;
  private logRepo: LogRepositoryV2;
  private db: DatabaseConnection;

  constructor(db?: DatabaseConnection) {
    this.db = db || new DatabaseFactory().create({ database: 'ai-square-v2' });
    this.scenarioRepo = new ScenarioRepositoryV2(this.db);
    this.projectRepo = new ProjectRepositoryV2(this.db);
    this.programRepo = new ProgramRepositoryV2(this.db);
    this.taskRepo = new TaskRepositoryV2(this.db);
    this.logRepo = new LogRepositoryV2(this.db);
  }

  /**
   * Create a new scenario from a project
   */
  async createScenarioFromProject(options: CreateScenarioFromProjectOptions): Promise<ApiResponse<ScenarioWithDetails>> {
    try {
      const { projectId, userId, language = 'en' } = options;

      // Get the project
      const project = await this.projectRepo.findById(projectId);
      if (!project) {
        return {
          success: false,
          error: 'Project not found'
        };
      }

      // Create the scenario
      const scenario = await this.scenarioRepo.create({
        code: `${project.code}-${userId}-${Date.now()}`,
        title: project.title,
        description: project.description,
        order_index: 0,
        is_active: true,
        metadata: {
          project_id: projectId,
          user_id: userId,
          language,
          ksa_mapping: project.ksa_mapping,
          difficulty: project.difficulty,
          estimated_duration: project.estimated_duration
        }
      });

      // Create programs based on difficulty
      const programs = await this.createProgramsForScenario(scenario.id, project);

      // Create tasks for each program
      const programsWithTasks: ProgramWithTasks[] = [];
      for (const program of programs) {
        const tasks = await this.createTasksForProgram(program.id, project);
        programsWithTasks.push({
          ...program,
          tasks
        });
      }

      // Create initial progress records
      await this.createInitialProgress(userId, scenario.id, programsWithTasks);

      return {
        success: true,
        data: {
          ...scenario,
          programs: programsWithTasks,
          project
        }
      };
    } catch (error) {
      console.error('Error creating scenario from project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create scenario'
      };
    }
  }

  /**
   * Get all available projects
   */
  async getProjects(): Promise<ApiResponse<Project[]>> {
    try {
      // For now, we'll return mock projects based on the existing scenarios
      // In a real implementation, these would be loaded from the database
      const mockProjects: Project[] = [
        {
          id: 'project_ai_job_search',
          code: 'ai-job-search',
          title: 'AI-Assisted Job Search Training',
          description: 'Master the art of using AI tools throughout your job search journey',
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
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'project_smart_city',
          code: 'high-school-smart-city',
          title: 'Smart City Planning with AI',
          description: 'Design future cities using AI-powered urban planning tools',
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
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'project_ai_education',
          code: 'ai-education-design',
          title: 'AI in Education Design',
          description: 'Create innovative educational experiences using AI tools',
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
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      
      return {
        success: true,
        data: mockProjects
      };
    } catch (error) {
      console.error('Error getting projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get projects'
      };
    }
  }

  /**
   * Get user's scenarios
   */
  async getUserScenarios(userId: string): Promise<ApiResponse<Scenario[]>> {
    try {
      const scenarios = await this.scenarioRepo.findMany({
        filters: {
          'metadata->user_id': userId
        }
      });
      
      return {
        success: true,
        data: scenarios.data || []
      };
    } catch (error) {
      console.error('Error getting user scenarios:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user scenarios'
      };
    }
  }

  /**
   * Get scenario details with programs and tasks
   */
  async getScenarioDetails(scenarioId: string): Promise<ApiResponse<ScenarioWithDetails>> {
    try {
      const scenario = await this.scenarioRepo.findById(scenarioId);
      if (!scenario) {
        return {
          success: false,
          error: 'Scenario not found'
        };
      }

      // Get programs
      const programs = await this.programRepo.findByScenario(scenarioId);
      
      // Get tasks for each program
      const programsWithTasks: ProgramWithTasks[] = [];
      for (const program of programs) {
        const tasks = await this.taskRepo.findByProgram(program.id);
        programsWithTasks.push({
          ...program,
          tasks
        });
      }

      // Get project if available
      let project: Project | undefined;
      if (scenario.metadata?.project_id) {
        const projectData = await this.projectRepo.findById(scenario.metadata.project_id);
        if (projectData) {
          project = projectData;
        }
      }

      return {
        success: true,
        data: {
          ...scenario,
          programs: programsWithTasks,
          project
        }
      };
    } catch (error) {
      console.error('Error getting scenario details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scenario details'
      };
    }
  }

  /**
   * Create programs for a scenario based on project difficulty
   */
  private async createProgramsForScenario(scenarioId: string, project: Project): Promise<Program[]> {
    const programs: Program[] = [];
    
    // Create programs based on difficulty
    if (project.difficulty === 'beginner') {
      programs.push(await this.programRepo.create({
        scenario_id: scenarioId,
        code: 'foundation',
        title: 'Foundation',
        description: 'Learn the basics and fundamentals',
        difficulty_level: 'beginner',
        order_index: 0,
        is_active: true,
        duration_hours: Math.ceil(project.estimated_duration / 60)
      }));
    } else if (project.difficulty === 'intermediate') {
      programs.push(await this.programRepo.create({
        scenario_id: scenarioId,
        code: 'foundation',
        title: 'Foundation',
        description: 'Review fundamentals and core concepts',
        difficulty_level: 'beginner',
        order_index: 0,
        is_active: true,
        duration_hours: Math.ceil(project.estimated_duration * 0.3 / 60)
      }));
      
      programs.push(await this.programRepo.create({
        scenario_id: scenarioId,
        code: 'application',
        title: 'Application',
        description: 'Apply knowledge to real scenarios',
        difficulty_level: 'intermediate',
        order_index: 1,
        is_active: true,
        duration_hours: Math.ceil(project.estimated_duration * 0.7 / 60)
      }));
    } else {
      programs.push(await this.programRepo.create({
        scenario_id: scenarioId,
        code: 'foundation',
        title: 'Foundation Review',
        description: 'Quick review of fundamentals',
        difficulty_level: 'beginner',
        order_index: 0,
        is_active: true,
        duration_hours: Math.ceil(project.estimated_duration * 0.2 / 60)
      }));
      
      programs.push(await this.programRepo.create({
        scenario_id: scenarioId,
        code: 'advanced-concepts',
        title: 'Advanced Concepts',
        description: 'Master advanced techniques',
        difficulty_level: 'intermediate',
        order_index: 1,
        is_active: true,
        duration_hours: Math.ceil(project.estimated_duration * 0.4 / 60)
      }));
      
      programs.push(await this.programRepo.create({
        scenario_id: scenarioId,
        code: 'mastery',
        title: 'Mastery',
        description: 'Expert-level challenges and projects',
        difficulty_level: 'advanced',
        order_index: 2,
        is_active: true,
        duration_hours: Math.ceil(project.estimated_duration * 0.4 / 60)
      }));
    }
    
    return programs;
  }

  /**
   * Create tasks for a program
   */
  private async createTasksForProgram(programId: string, project: Project): Promise<Task[]> {
    const tasks: Task[] = [];
    
    // Create learning tasks
    tasks.push(await this.taskRepo.create({
      program_id: programId,
      code: 'task-1',
      title: 'Introduction and Overview',
      description: `Learn about ${project.title}`,
      instructions: 'Follow the AI tutor guidance to understand the core concepts',
      task_type: 'learning',
      order_index: 0,
      is_active: true,
      estimated_minutes: 15,
      evaluation_criteria: [
        'Understanding of key concepts',
        'Ability to ask relevant questions',
        'Engagement with the material'
      ]
    }));

    tasks.push(await this.taskRepo.create({
      program_id: programId,
      code: 'task-2',
      title: 'Hands-on Practice',
      description: 'Apply what you learned',
      instructions: 'Complete the practice exercises with AI assistance',
      task_type: 'practice',
      order_index: 1,
      is_active: true,
      estimated_minutes: 20,
      evaluation_criteria: [
        'Correct application of concepts',
        'Problem-solving approach',
        'Quality of solutions'
      ]
    }));

    tasks.push(await this.taskRepo.create({
      program_id: programId,
      code: 'task-3',
      title: 'Assessment',
      description: 'Demonstrate your understanding',
      instructions: 'Complete the assessment to show mastery',
      task_type: 'assessment',
      order_index: 2,
      is_active: true,
      estimated_minutes: 25,
      evaluation_criteria: [
        'Accuracy of answers',
        'Depth of understanding',
        'Application of knowledge'
      ]
    }));

    return tasks;
  }

  /**
   * Create initial progress records
   */
  private async createInitialProgress(
    userId: string, 
    scenarioId: string, 
    programsWithTasks: ProgramWithTasks[]
  ): Promise<void> {
    // Note: In a real implementation, these would be created in separate progress repositories
    // For now, we're just logging the intent
    console.log('Creating initial progress for:', {
      userId,
      scenarioId,
      programCount: programsWithTasks.length,
      totalTasks: programsWithTasks.reduce((sum, p) => sum + p.tasks.length, 0)
    });
  }
}