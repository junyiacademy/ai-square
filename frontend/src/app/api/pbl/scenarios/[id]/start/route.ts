import { NextRequest, NextResponse } from 'next/server';
import { learningServiceFactory } from '@/lib/services/learning-service-factory';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { validateProgramStart } from '@/lib/validators/program-validator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('🚨 START API CALLED - This should only happen when explicitly requested!');
  console.log('   Timestamp:', new Date().toISOString());
  console.log('   Scenario ID:', id);
  
  // Log request headers to trace the source
  console.log('   Request headers:', {
    referer: request.headers.get('referer'),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin')
  });
  
  try {
    const scenarioId = id;
    
    // Get user info using unified auth
    const auth = await getUnifiedAuth(request);
    const userEmail = auth?.user.email;
    
    console.log('   User email:', userEmail);
    
    if (!auth || !userEmail) {
      return createUnauthorizedResponse();
    }
    
    // Get request body (handle empty body)
    let body: { language?: string } = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      console.log('No JSON body provided, using defaults');
    }
    const language = body.language || 'en';
    
    // Validate UUID format
    if (!scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scenario ID format. UUID required.'
        },
        { status: 400 }
      );
    }
    
    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Verify scenario exists and is PBL type
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario not found'
        },
        { status: 404 }
      );
    }
    
    if (scenario.mode !== 'pbl') {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario is not a PBL scenario'
        },
        { status: 400 }
      );
    }
    
    // Get or create user
    let user = await userRepo.findByEmail(userEmail);
    if (!user) {
      console.log('   Creating new user for:', userEmail);
      user = await userRepo.create({
        email: userEmail,
        name: userEmail.split('@')[0],
        preferredLanguage: language
      });
    }
    
    // Use our TDD validator to check if program can be started
    const validation = validateProgramStart(scenario, user as unknown as import('@/types/database').DBUser);
    if (!validation.isValid) {
      console.log('   ❌ Validation failed:', validation.error);
      return NextResponse.json(
        {
          success: false,
          error: validation.error
        },
        { status: 400 }
      );
    }
    
    console.log('   ✅ Validation passed');
    console.log('   User ID:', user.id);
    console.log('   Using PBL Learning Service to start learning...');
    
    // Use the new service layer
    const pblService = learningServiceFactory.getService('pbl');
    const program = await pblService.startLearning(
      user.id,
      scenarioId,
      { language }
    );
    
    console.log('   ✅ Program created with UUID:', program.id);
    
    // Get created tasks to return their IDs
    const taskRepo = repositoryFactory.getTaskRepository();
    const tasks = await taskRepo.findByProgram(program.id);
    const taskIds = tasks.map(t => t.id);
    
    // Return response compatible with frontend expectations
    return NextResponse.json({
      success: true,
      id: program.id,  // Frontend expects id at root level
      program,
      tasks,  // Frontend expects tasks array
      taskIds,  // Also provide taskIds for compatibility
      language
    });
    
  } catch (error) {
    console.error('Error starting PBL program:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start program'
      },
      { status: 500 }
    );
  }
}