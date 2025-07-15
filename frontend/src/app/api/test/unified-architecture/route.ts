import { NextResponse } from 'next/server';
import {
  getScenarioRepository,
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
} from '@/lib/implementations/gcs-v2';

export async function GET() {
  try {
    const results = {
      message: 'Unified Learning Architecture Test Endpoint',
      architecture: {
        bucketName: process.env.GCS_BUCKET_NAME || 'ai-square-db-v2',
        isConfigured: !!process.env.GOOGLE_CLOUD_PROJECT,
      },
      data: {
        scenarios: [] as any[],
        programs: [] as any[],
        tasks: [] as any[],
        evaluations: [] as any[],
      },
      operations: {
        listScenarios: false,
        createTestScenario: false,
      }
    };

    try {
      // 嘗試列出所有 scenarios
      const scenarioRepo = getScenarioRepository();
      const scenarios = await scenarioRepo.listAll();
      results.data.scenarios = scenarios.slice(0, 5); // 只顯示前 5 個
      results.operations.listScenarios = true;

      // 如果有 scenarios，取得第一個的相關 programs
      if (scenarios.length > 0) {
        const programRepo = getProgramRepository();
        const programs = await programRepo.findByScenario(scenarios[0].id);
        results.data.programs = programs.slice(0, 5);
      }
    } catch (error) {
      console.error('Error accessing GCS:', error);
      results.architecture.isConfigured = false;
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'create-test';

    if (action === 'create-test') {
      // 創建完整的測試流程
      const testResults = {
        scenario: null as any,
        program: null as any,
        task: null as any,
        evaluation: null as any,
      };

      // 1. 創建 Scenario
      const scenarioRepo = getScenarioRepository();
      const scenario = await scenarioRepo.create({
        sourceType: 'pbl',
        sourceRef: {
          type: 'yaml',
          path: 'test/api-test.yaml',
          metadata: { createdBy: 'api-test' },
        },
        title: `API Test Scenario ${Date.now()}`,
        description: 'Created via test API endpoint',
        objectives: ['Test the unified architecture', 'Verify GCS integration'],
        taskTemplates: [
          {
            id: 'template-1',
            title: 'Test Task Template',
            type: 'chat',
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      testResults.scenario = scenario;

      // 2. 創建 Program
      const programRepo = getProgramRepository();
      const program = await programRepo.create({
        scenarioId: scenario.id,
        userId: 'test-user@example.com',
        status: 'active',
        startedAt: new Date().toISOString(),
        taskIds: [],
        currentTaskIndex: 0,
        metadata: { 
          sourceType: 'discovery',
          testRun: true,
          createdAt: new Date().toISOString(),
        },
      });
      testResults.program = program;

      // 3. 創建 Task
      const taskRepo = getTaskRepository();
      const task = await taskRepo.create({
        programId: program.id,
        scenarioTaskIndex: 0,
        title: 'Test Task Instance',
        type: 'chat',
        content: {
          instructions: 'This is a test task',
          context: {
            testData: true,
          },
        },
        status: 'pending',
        startedAt: new Date().toISOString(),
        interactions: []
      });
      testResults.task = task;

      // 4. 添加互動
      await taskRepo.addInteraction(task.id, {
        timestamp: new Date().toISOString(),
        type: 'user_input',
        content: { message: 'Test message from API' },
      });

      // 5. 創建評估
      const evaluationRepo = getEvaluationRepository();
      const evaluation = await evaluationRepo.create({
        targetType: 'task',
        targetId: task.id,
        evaluationType: 'api_test',
        score: 95,
        feedback: 'Test evaluation created successfully',
        dimensions: [],
        metadata: {
          programId: program.id,
          automated: true,
        },
        createdAt: new Date().toISOString(),
      });
      testResults.evaluation = evaluation;

      return NextResponse.json({
        success: true,
        message: 'Test data created successfully',
        data: testResults,
        instructions: {
          next: 'You can now query these IDs to verify the data was saved correctly',
          cleanup: 'POST to this endpoint with action: "cleanup" to remove test data',
        },
      });
    }

    if (action === 'cleanup') {
      // 清理測試數據的邏輯（如果需要）
      return NextResponse.json({
        success: true,
        message: 'Cleanup not implemented yet',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "create-test" or "cleanup"',
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
    }, { status: 500 });
  }
}