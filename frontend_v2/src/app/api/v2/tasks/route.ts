/**
 * V2 Tasks API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { TaskRepository } from '@/lib/v2/repositories/task.repository';
import { ProgramRepository } from '@/lib/v2/repositories/program.repository';
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { StorageFactory } from '@/lib/v2/storage/storage.factory';

// GET /api/v2/tasks - List tasks for a program
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { error: 'programId is required' },
        { status: 400 }
      );
    }

    const storage = await StorageFactory.getStorage();
    const programRepo = new ProgramRepository(storage);
    const taskRepo = new TaskRepository(storage);
    const scenarioRepo = new ScenarioRepository(storage);
    
    // Verify program access
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    // Verify scenario ownership
    const scenario = await scenarioRepo.findById(program.scenario_id);
    if (!scenario || scenario.user_id !== user.email) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const tasks = await taskRepo.findByProgram(programId);

    return NextResponse.json({
      tasks,
      count: tasks.length,
      active: tasks.find(t => t.status === 'active'),
      completed: tasks.filter(t => t.status === 'completed').length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}