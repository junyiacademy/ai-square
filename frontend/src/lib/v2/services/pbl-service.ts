/**
 * PBL Service V2
 * Implements standard Problem-Based Learning structure
 */

import { BaseLearningServiceV2 } from './base-learning-service';
import { Track, Program, Task, TrackWithHierarchy } from '../types';
import { DatabaseConnection } from '../utils/database';

export class PBLServiceV2 extends BaseLearningServiceV2 {
  constructor(db: DatabaseConnection) {
    super(db);
  }

  getServiceName(): string {
    return 'PBL Service';
  }

  getDefaultStructureType(): 'standard' | 'direct_task' | 'single_program' {
    return 'standard';
  }

  /**
   * Create a PBL scenario with standard structure
   */
  async createPBLScenario(
    scenarioData: {
      code: string;
      title: string;
      description: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      domains: string[];
      programs: Array<{
        code: string;
        title: string;
        description: string;
        difficulty_level: 'beginner' | 'intermediate' | 'advanced';
        tasks: Array<{
          code: string;
          title: string;
          description: string;
          instructions: string;
          task_type: 'learning' | 'practice' | 'assessment';
          ai_modules?: string[];
        }>;
      }>;
    }
  ): Promise<TrackWithHierarchy> {
    // Create the track with standard structure
    const track = await this.createTrack(
      {
        code: scenarioData.code,
        title: scenarioData.title,
        description: scenarioData.description,
        structure_type: 'standard',
        order_index: 0,
        is_active: true,
        metadata: {
          difficulty: scenarioData.difficulty,
          domains: scenarioData.domains
        }
      },
      {
        structure_type: 'standard'
      }
    );

    // Create programs with tasks
    for (let i = 0; i < scenarioData.programs.length; i++) {
      const programData = scenarioData.programs[i];
      const program = await this.createProgram(
        track.id,
        {
          code: programData.code,
          title: programData.title,
          description: programData.description,
          difficulty_level: programData.difficulty_level,
          order_index: i,
          is_active: true
        },
        {
          tasks: programData.tasks.map((task, j) => ({
            code: task.code,
            title: task.title,
            description: task.description,
            instructions: task.instructions,
            task_type: task.task_type,
            task_variant: 'standard',
            order_index: j,
            is_active: true,
            metadata: {
              ai_modules: task.ai_modules
            }
          }))
        }
      );
      track.programs.push(program);
    }

    return track;
  }

  /**
   * Import PBL scenario from YAML data
   */
  async importFromYAML(yamlData: any): Promise<TrackWithHierarchy> {
    return this.createPBLScenario({
      code: yamlData.scenario_id,
      title: yamlData.title,
      description: yamlData.description,
      difficulty: yamlData.difficulty_level,
      domains: yamlData.domains || [],
      programs: yamlData.programs.map((prog: any) => ({
        code: prog.program_id,
        title: prog.title,
        description: prog.description || '',
        difficulty_level: prog.difficulty_level || 'beginner',
        tasks: prog.tasks.map((task: any) => ({
          code: task.task_id,
          title: task.title,
          description: task.description || '',
          instructions: task.instructions || '',
          task_type: task.task_type || 'learning',
          ai_modules: task.ai_modules || []
        }))
      }))
    });
  }

  /**
   * Create a track from a project (for compatibility with test page)
   */
  async createTrackFromProject(options: {
    project: any;
    userId: string;
    language?: string;
  }): Promise<TrackWithHierarchy> {
    const { project, userId, language = 'en' } = options;
    
    // Map project to PBL scenario format
    return this.createPBLScenario({
      code: `${project.code}_${userId}_${Date.now()}`,
      title: project.title,
      description: project.description,
      difficulty: project.difficulty,
      domains: project.target_domains || [],
      programs: this.generateProgramsFromProject(project)
    });
  }

  /**
   * Generate programs based on project difficulty
   */
  private generateProgramsFromProject(project: any): any[] {
    const programs = [];
    
    if (project.difficulty === 'beginner') {
      programs.push({
        code: 'foundation',
        title: 'Foundation',
        description: 'Learn the basics and fundamentals',
        difficulty_level: 'beginner',
        tasks: this.generateTasksForProgram('foundation', project)
      });
    } else if (project.difficulty === 'intermediate') {
      programs.push({
        code: 'foundation',
        title: 'Foundation',
        description: 'Review fundamentals and core concepts',
        difficulty_level: 'beginner',
        tasks: this.generateTasksForProgram('foundation', project)
      });
      programs.push({
        code: 'application',
        title: 'Application',
        description: 'Apply knowledge to real scenarios',
        difficulty_level: 'intermediate',
        tasks: this.generateTasksForProgram('application', project)
      });
    } else {
      programs.push({
        code: 'foundation',
        title: 'Foundation Review',
        description: 'Quick review of fundamentals',
        difficulty_level: 'beginner',
        tasks: this.generateTasksForProgram('foundation', project)
      });
      programs.push({
        code: 'advanced',
        title: 'Advanced Concepts',
        description: 'Master advanced techniques',
        difficulty_level: 'intermediate',
        tasks: this.generateTasksForProgram('advanced', project)
      });
      programs.push({
        code: 'mastery',
        title: 'Mastery',
        description: 'Expert-level challenges and projects',
        difficulty_level: 'advanced',
        tasks: this.generateTasksForProgram('mastery', project)
      });
    }
    
    return programs;
  }

  /**
   * Generate tasks for a program
   */
  private generateTasksForProgram(programType: string, project: any): any[] {
    return [
      {
        code: 'task-1',
        title: 'Introduction and Overview',
        description: `Learn about ${project.title}`,
        instructions: 'Follow the AI tutor guidance to understand the core concepts',
        task_type: 'learning',
        ai_modules: ['tutor', 'concept_explainer']
      },
      {
        code: 'task-2',
        title: 'Hands-on Practice',
        description: 'Apply what you learned',
        instructions: 'Complete the practice exercises with AI assistance',
        task_type: 'practice',
        ai_modules: ['practice_assistant', 'hint_provider']
      },
      {
        code: 'task-3',
        title: 'Assessment',
        description: 'Demonstrate your understanding',
        instructions: 'Complete the assessment to show mastery',
        task_type: 'assessment',
        ai_modules: ['evaluator', 'feedback_generator']
      }
    ];
  }

  /**
   * Get all PBL scenarios
   */
  async getAllPBLScenarios(): Promise<Track[]> {
    return this.getTracksByStructureType('standard');
  }

  /**
   * Get PBL scenario by code
   */
  async getPBLScenarioByCode(code: string): Promise<TrackWithHierarchy | null> {
    const track = await this.trackRepo.findByCode(code);
    if (!track || track.structure_type !== 'standard') return null;

    return this.getTrackWithHierarchy(track.id);
  }

  /**
   * Update PBL scenario metadata
   */
  async updatePBLScenarioMetadata(
    trackId: string,
    metadata: {
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      domains?: string[];
      prerequisites?: string[];
      learning_objectives?: string[];
    }
  ): Promise<Track> {
    const track = await this.trackRepo.findById(trackId);
    if (!track) throw new Error('Track not found');

    return this.trackRepo.update(trackId, {
      metadata: {
        ...track.metadata,
        ...metadata
      }
    });
  }
}