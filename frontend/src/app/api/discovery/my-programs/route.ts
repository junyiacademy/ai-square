/**
 * API endpoint to get user's Discovery programs and scenarios
 * GET /api/discovery/my-programs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { cacheService } from '@/lib/cache/cache-service';
import type { Task } from '@/lib/repositories/interfaces';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check cache first
    const cacheKey = `discovery-my-scenarios-${user.email}`;
    const cached = await cacheService.get<unknown[]>(cacheKey);
    if (cached) {
      console.log('Returning cached my scenarios');
      return NextResponse.json(cached);
    }

    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Find all user's programs
    const allPrograms = await programRepo.findByUser(user.email);
    
    // Filter for Discovery programs
    const discoveryPrograms = allPrograms.filter(program => {
      // Check if this is a Discovery program by looking at the scenario
      return program.metadata?.sourceType === 'discovery' || 
             program.scenarioId.includes('discovery') ||
             program.metadata?.careerType; // Discovery programs have careerType
    });

    if (discoveryPrograms.length === 0) {
      // Cache empty result for shorter time
      await cacheService.set(cacheKey, [], { ttl: 30 * 1000 }); // 30 seconds
      return NextResponse.json([]);
    }

    // Get unique scenario IDs
    const scenarioIds = [...new Set(discoveryPrograms.map(p => p.scenarioId))];
    
    // Fetch all scenarios in parallel
    const scenarios = await Promise.all(
      scenarioIds.map(async (id) => {
        try {
          return await scenarioRepo.findById(id);
        } catch (error) {
          console.error(`Failed to load scenario ${id}:`, error);
          return null;
        }
      })
    );

    // Filter out null scenarios
    const validScenarios = scenarios.filter(s => s !== null);

    // Build response with scenario and program details
    const myScenarios = await Promise.all(
      validScenarios.map(async (scenario) => {
        // Get programs for this scenario
        const scenarioPrograms = discoveryPrograms.filter(p => p.scenarioId === scenario!.id);
        
        // Find active program
        const activeProgram = scenarioPrograms.find(p => p.status === 'active');
        
        // Calculate progress for active program and get latest activity
        let progress = 0;
        let completedTasks = 0;
        let totalTasks = 0;
        let activeProgramTasks: Task[] = [];
        
        if (activeProgram) {
          // Get tasks for the active program
          activeProgramTasks = await taskRepo.findByProgram(activeProgram.id);
          totalTasks = activeProgramTasks.length;
          completedTasks = activeProgramTasks.filter(t => t.status === 'completed').length;
          progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        }
        
        // Get latest activity from programs and their tasks
        let latestActivity = new Date().getTime();
        
        if (scenarioPrograms.length > 0) {
          // Check program start times and completed times
          const programTimes = scenarioPrograms.map(p => {
            const times: number[] = [];
            if (p.startTime) {
              times.push(new Date(p.startTime).getTime());
            }
            if (p.endTime) {
              times.push(new Date(p.endTime).getTime());
            }
            if (p.lastActivityAt) {
              times.push(new Date(p.lastActivityAt).getTime());
            }
            return times.length > 0 ? Math.max(...times) : 0;
          });
          
          // Also check task update times for active program
          if (activeProgram && activeProgramTasks.length > 0) {
            const taskTimes = activeProgramTasks.map(t => {
              const times: number[] = [];
              if (t.startedAt) {
                times.push(new Date(t.startedAt).getTime());
              }
              if (t.completedAt) {
                times.push(new Date(t.completedAt).getTime());
              }
              return times.length > 0 ? Math.max(...times) : 0;
            });
            programTimes.push(Math.max(...taskTimes));
          }
          
          latestActivity = Math.max(...programTimes);
        }
        
        return {
          ...scenario,
          // Add user-specific data
          userPrograms: {
            total: scenarioPrograms.length,
            active: activeProgram ? {
              id: activeProgram.id,
              startedAt: activeProgram.startedAt,
              progress,
              completedTasks,
              totalTasks,
              currentTaskIndex: activeProgram.currentTaskIndex
            } : null,
            completed: scenarioPrograms.filter(p => p.status === 'completed').length,
            lastActivity: new Date(latestActivity).toISOString()
          }
        };
      })
    );

    // Sort by last activity (most recent first)
    myScenarios.sort((a, b) => 
      new Date(b.userPrograms.lastActivity).getTime() - 
      new Date(a.userPrograms.lastActivity).getTime()
    );

    // Cache the result
    await cacheService.set(cacheKey, myScenarios, { ttl: 60 * 1000 }); // Cache for 1 minute

    return NextResponse.json(myScenarios);
  } catch (error) {
    console.error('Error in GET /api/discovery/my-programs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}