import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/services/memory-service';

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();
    
    // Get user info from request header
    const userStr = req.headers.get('x-user-info');
    
    if (!userStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userInfo = JSON.parse(userStr);
    const userEmail = userInfo.email;
    
    const memoryService = MemoryService.getInstance();
    
    switch (type) {
      case 'pbl_completed':
        // Update short-term memory with PBL completion
        await memoryService.addActivity(userEmail, {
          type: 'pbl_completed',
          details: {
            scenarioId: data.scenarioId,
            score: data.score,
            timeSpent: data.timeSpent
          }
        });
        
        // Update current progress
        await memoryService.updateShortTermMemory(userEmail, {
          currentProgress: {
            lastScenario: data.scenarioId,
            completedTasks: data.completedTasks
          }
        });
        
        // If high score, add achievement
        if (data.score >= 90) {
          await memoryService.addAchievement(userEmail, {
            type: 'high_score',
            details: {
              scenarioId: data.scenarioId,
              score: data.score
            }
          });
        }
        break;
        
      case 'assessment_completed':
        // Update with assessment results
        await memoryService.addActivity(userEmail, {
          type: 'assessment_completed',
          details: {
            overallScore: data.overallScore,
            domainScores: data.domainScores
          }
        });
        
        await memoryService.updateShortTermMemory(userEmail, {
          currentProgress: {
            assessmentDate: new Date().toISOString()
          }
        });
        break;
        
      case 'profile_updated':
        // Update long-term profile
        await memoryService.updateLongTermMemory(userEmail, {
          profile: data.profile
        });
        break;
        
      case 'learning_preference':
        // Update preferences
        await memoryService.updateLongTermMemory(userEmail, {
          preferences: data.preferences
        });
        break;
        
      case 'compact_memory':
        // Compact memory (usually called weekly)
        await memoryService.compactMemory(userEmail);
        break;
        
      default:
        return NextResponse.json({ error: 'Unknown update type' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory update error:', error);
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}