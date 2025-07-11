/**
 * Usage examples for the GCS v2 Index System
 */

import { IndexService } from './index-service';
import { QueryService } from './query-service';
import { getStorageService } from '@/lib/abstractions/storage-factory';
import { 
  getScenarioRepository,
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository
} from '../index';

// Initialize services
const storage = getStorageService();
const indexService = new IndexService(storage);
const queryService = new QueryService(
  indexService,
  getScenarioRepository(),
  getProgramRepository(),
  getTaskRepository(),
  getEvaluationRepository()
);

// ===== Example 1: Track user progress =====
async function trackUserProgress(userId: string, email: string) {
  // When user starts a program
  await indexService.updateUserIndex(userId, email, {
    programId: 'program-123',
    scenarioId: 'scenario-456',
    status: 'active',
    startedAt: new Date().toISOString()
  });

  // Record activity
  await indexService.addActivity({
    type: 'program_started',
    userId,
    entityId: 'program-123',
    metadata: { scenarioId: 'scenario-456' }
  });

  // Update scenario stats
  await indexService.updateScenarioStats('scenario-456', {
    totalPrograms: 10, // increment
    activePrograms: 5  // increment
  });
}

// ===== Example 2: Query scenario hierarchy =====
async function getScenarioDetails(scenarioId: string) {
  const hierarchy = await queryService.getScenarioHierarchy(scenarioId);
  
  if (hierarchy) {
    console.log(`Scenario: ${hierarchy.scenario.title}`);
    console.log(`Programs: ${hierarchy.scenario.programs.length}`);
    
    hierarchy.scenario.programs.forEach(program => {
      console.log(`  Program ${program.id}: ${program.status}`);
      console.log(`  Tasks: ${program.tasks.length}`);
      
      program.tasks.forEach(task => {
        console.log(`    Task ${task.id}: ${task.evaluations.length} evaluations`);
      });
    });
  }
}

// ===== Example 3: Get user's learning journey =====
async function getUserJourney(userId: string) {
  const journey = await queryService.getUserLearningPath(userId);
  
  console.log(`User: ${journey.email}`);
  console.log(`Learning Journey:`);
  
  journey.learningJourney.forEach(day => {
    console.log(`\n${day.date}:`);
    day.activities.forEach(activity => {
      console.log(`  ${activity.type} at ${activity.timestamp}`);
      if (activity.score) console.log(`    Score: ${activity.score}%`);
      if (activity.duration) console.log(`    Duration: ${activity.duration}s`);
    });
  });
}

// ===== Example 4: Get learning statistics =====
async function getLearningReport(userId: string) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const stats = await queryService.getLearningStats(
    userId,
    startDate.toISOString().split('T')[0],
    endDate
  );
  
  console.log('30-Day Learning Report:');
  console.log(`Programs Started: ${stats.programsStarted}`);
  console.log(`Programs Completed: ${stats.programsCompleted}`);
  console.log(`Tasks Completed: ${stats.tasksCompleted}`);
  console.log(`Total Time: ${Math.round(stats.totalTimeSpent / 3600)} hours`);
  console.log(`Average Score: ${stats.averageScore.toFixed(1)}%`);
  
  console.log('\nDaily Activity:');
  stats.dailyActivity.forEach(day => {
    console.log(`  ${day.date}: ${day.minutes} minutes`);
  });
}

// ===== Example 5: Find and display recommendations =====
async function getRecommendations(userId: string) {
  const recommendations = await queryService.getScenarioRecommendations(userId, 5);
  
  console.log('Recommended Scenarios:');
  recommendations.forEach(rec => {
    console.log(`- Scenario ${rec.scenarioId}`);
    if (rec.reason === 'not_attempted') {
      console.log('  Reason: You haven\'t tried this yet!');
    } else if (rec.reason === 'improve_score') {
      console.log(`  Reason: Your best score is ${rec.score}%. Try to improve!`);
    }
  });
}

// ===== Example 6: Maintain indexes =====
async function performMaintenance() {
  // Clean up old activity logs
  await indexService.cleanupOldActivity(30); // Keep 30 days
  
  // Find orphaned entities
  const orphaned = await queryService.findOrphanedEntities();
  console.log(`Found ${orphaned.tasks.length} orphaned tasks`);
  console.log(`Found ${orphaned.evaluations.length} orphaned evaluations`);
}

// ===== Example 7: Query programs with details =====
async function getScenarioPrograms(scenarioId: string) {
  const programs = await queryService.getProgramsWithTaskCount(scenarioId);
  
  console.log(`Programs for scenario ${scenarioId}:`);
  programs.forEach(p => {
    console.log(`- Program ${p.programId} (${p.status})`);
    console.log(`  User: ${p.userId}`);
    console.log(`  Tasks: ${p.completedTaskCount}/${p.taskCount} completed`);
    console.log(`  Evaluations: ${p.evaluationCount}`);
  });
}

// Export for use in other modules
export {
  trackUserProgress,
  getScenarioDetails,
  getUserJourney,
  getLearningReport,
  getRecommendations,
  performMaintenance,
  getScenarioPrograms
};