/**
 * Query Service for fast relationship queries
 * Provides optimized methods for common query patterns
 */

import { IndexService } from './index-service';
import { 
  BaseScenarioRepository,
  BaseProgramRepository,
  BaseTaskRepository,
  BaseEvaluationRepository
} from '@/types/unified-learning';
import { HierarchyQueryResult, UserLearningPath } from './index-types';

export class QueryService {
  constructor(
    private indexService: IndexService,
    private scenarioRepo: BaseScenarioRepository<any>,
    private programRepo: BaseProgramRepository<any>,
    private taskRepo: BaseTaskRepository<any>,
    private evaluationRepo: BaseEvaluationRepository<any>
  ) {}

  /**
   * Get complete hierarchy for a scenario
   * Scenario -> Programs -> Tasks -> Evaluations
   */
  async getScenarioHierarchy(scenarioId: string): Promise<HierarchyQueryResult | null> {
    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) return null;

    // Get all programs for this scenario
    const programs = await this.programRepo.findByScenario(scenarioId);
    
    // Build hierarchy
    const hierarchy: HierarchyQueryResult = {
      scenario: {
        id: scenario.id,
        title: scenario.title,
        programs: []
      }
    };

    // Fetch tasks and evaluations for each program
    for (const program of programs) {
      const tasks = await this.taskRepo.findByProgram(program.id);
      
      const programData = {
        id: program.id,
        status: program.status,
        tasks: tasks.map(task => ({
          id: task.id,
          status: task.status,
          evaluations: [] as string[]
        }))
      };

      // Get evaluations for each task
      for (let i = 0; i < tasks.length; i++) {
        const taskEvals = await this.evaluationRepo.findByTarget('task', tasks[i].id);
        programData.tasks[i].evaluations = taskEvals.map(e => e.id);
      }

      hierarchy.scenario.programs.push(programData);
    }

    return hierarchy;
  }

  /**
   * Get user's complete learning path
   */
  async getUserLearningPath(userId: string): Promise<UserLearningPath> {
    const userIndex = await this.indexService.getUserIndex(userId);
    if (!userIndex) {
      return {
        userId,
        email: userId,
        learningJourney: []
      };
    }

    // Get recent activity
    const recentActivity = await this.indexService.getUserRecentActivity(userId, 30);
    
    // Group by date
    const journeyMap = new Map<string, UserLearningPath['learningJourney'][0]>();
    
    for (const activity of recentActivity) {
      const date = activity.timestamp.split('T')[0];
      
      if (!journeyMap.has(date)) {
        journeyMap.set(date, {
          date,
          activities: []
        });
      }
      
      const dayActivities = journeyMap.get(date)!;
      dayActivities.activities.push({
        type: activity.type as any,
        timestamp: activity.timestamp,
        entityId: activity.entityId,
        score: activity.metadata?.score,
        duration: activity.metadata?.duration
      });
    }

    return {
      userId,
      email: userIndex.email,
      learningJourney: Array.from(journeyMap.values())
        .sort((a, b) => b.date.localeCompare(a.date))
    };
  }

  /**
   * Get programs with their task count
   */
  async getProgramsWithTaskCount(scenarioId: string): Promise<Array<{
    programId: string;
    userId: string;
    status: string;
    taskCount: number;
    completedTaskCount: number;
    evaluationCount: number;
  }>> {
    const programs = await this.programRepo.findByScenario(scenarioId);
    const results = [];

    for (const program of programs) {
      const tasks = await this.taskRepo.findByProgram(program.id);
      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      // Count evaluations
      let evaluationCount = 0;
      for (const task of tasks) {
        const evals = await this.evaluationRepo.findByTarget('task', task.id);
        evaluationCount += evals.length;
      }

      results.push({
        programId: program.id,
        userId: program.userId,
        status: program.status,
        taskCount: tasks.length,
        completedTaskCount: completedTasks.length,
        evaluationCount
      });
    }

    return results;
  }

  /**
   * Find orphaned entities (for cleanup)
   */
  async findOrphanedEntities(): Promise<{
    tasks: string[];
    evaluations: string[];
  }> {
    const orphaned = {
      tasks: [] as string[],
      evaluations: [] as string[]
    };

    // This would require listing all entities and checking relationships
    // Implementation depends on storage service capabilities
    
    return orphaned;
  }

  /**
   * Get scenario recommendations based on user history
   */
  async getScenarioRecommendations(userId: string, limit: number = 5): Promise<Array<{
    scenarioId: string;
    reason: 'not_attempted' | 'improve_score' | 'similar_interest';
    score?: number;
  }>> {
    const userPrograms = await this.indexService.getUserPrograms(userId);
    const attemptedScenarios = new Set(userPrograms.map(p => p.scenarioId));
    
    // Get all scenarios
    const allScenarios = await this.scenarioRepo.findBySource('assessment');
    
    const recommendations = [];
    
    // Add scenarios not attempted
    for (const scenario of allScenarios) {
      if (!attemptedScenarios.has(scenario.id)) {
        recommendations.push({
          scenarioId: scenario.id,
          reason: 'not_attempted' as const
        });
      }
    }
    
    // Add scenarios where user can improve
    for (const program of userPrograms) {
      if (program.status === 'completed') {
        // Check if score can be improved
        const evaluations = await this.evaluationRepo.findByTarget('program', program.programId);
        const bestScore = Math.max(...evaluations.map(e => e.score || 0));
        
        if (bestScore < 80) {
          recommendations.push({
            scenarioId: program.scenarioId,
            reason: 'improve_score' as const,
            score: bestScore
          });
        }
      }
    }
    
    return recommendations.slice(0, limit);
  }

  /**
   * Get learning statistics for a time period
   */
  async getLearningStats(userId: string, startDate: string, endDate: string): Promise<{
    programsStarted: number;
    programsCompleted: number;
    tasksCompleted: number;
    totalTimeSpent: number;
    averageScore: number;
    dailyActivity: Array<{ date: string; minutes: number }>;
  }> {
    const activities = await this.indexService.getActivityRange(startDate, endDate);
    const userActivities = activities.flatMap(day => 
      day.activities.filter(a => a.userId === userId)
    );

    const stats = {
      programsStarted: userActivities.filter(a => a.type === 'program_started').length,
      programsCompleted: userActivities.filter(a => a.type === 'program_completed').length,
      tasksCompleted: userActivities.filter(a => a.type === 'task_completed').length,
      totalTimeSpent: 0,
      averageScore: 0,
      dailyActivity: [] as Array<{ date: string; minutes: number }>
    };

    // Calculate time spent and scores
    const scores: number[] = [];
    const dailyMap = new Map<string, number>();

    for (const activity of userActivities) {
      if (activity.metadata?.duration) {
        stats.totalTimeSpent += activity.metadata.duration;
        
        const date = activity.timestamp.split('T')[0];
        dailyMap.set(date, (dailyMap.get(date) || 0) + activity.metadata.duration);
      }
      
      if (activity.metadata?.score !== undefined) {
        scores.push(activity.metadata.score);
      }
    }

    // Calculate average score
    if (scores.length > 0) {
      stats.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Convert daily activity to array
    stats.dailyActivity = Array.from(dailyMap.entries())
      .map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }
}