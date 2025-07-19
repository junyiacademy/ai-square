/**
 * Evaluations API Route
 * 使用新的 PostgreSQL Repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getVertexAI } from '@/lib/ai/vertex-ai-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const programId = searchParams.get('programId');
    const taskId = searchParams.get('taskId');

    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    if (userId) {
      // Get user's evaluation history
      const evaluations = await evaluationRepo.getDetailedEvaluations(userId, 20);
      const progress = await evaluationRepo.getUserProgress(userId);
      const ksaProgress = await evaluationRepo.getKSAProgress(userId);
      
      return NextResponse.json({
        evaluations,
        progress,
        ksaProgress
      });
    } else if (programId) {
      const evaluations = await evaluationRepo.findByProgram(programId);
      return NextResponse.json(evaluations);
    } else if (taskId) {
      const evaluations = await evaluationRepo.findByTask(taskId);
      return NextResponse.json(evaluations);
    } else {
      return NextResponse.json(
        { error: 'userId, programId, or taskId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      programId,
      taskId,
      evaluationType,
      context,
      userResponse,
      rubric
    } = body;

    if (!userId || !evaluationType) {
      return NextResponse.json(
        { error: 'userId and evaluationType are required' },
        { status: 400 }
      );
    }

    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Get task details if taskId provided
    let task;
    if (taskId) {
      task = await taskRepo.findById(taskId);
      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
    }

    // Perform AI evaluation
    const vertexAI = getVertexAI();
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const evaluationPrompt = `
    You are evaluating a student's response for an AI literacy learning task.
    
    Task Context: ${JSON.stringify(context)}
    Student Response: ${JSON.stringify(userResponse)}
    Evaluation Rubric: ${JSON.stringify(rubric)}
    
    Please provide:
    1. A score from 0-100
    2. Detailed feedback in a supportive tone
    3. KSA (Knowledge, Skills, Attitudes) breakdown scores
    4. Specific strengths and areas for improvement
    
    Response in JSON format:
    {
      "score": number,
      "feedback": "string",
      "ksaScores": {
        "knowledge": number,
        "skills": number,
        "attitudes": number
      },
      "strengths": ["string"],
      "improvements": ["string"]
    }
    `;

    const result = await model.generateContent(evaluationPrompt);
    const response = result.response;
    const aiEvaluation = JSON.parse(response.candidates?.[0]?.context?.parts?.[0]?.text || '{}');

    // Create evaluation record
    const evaluation = await evaluationRepo.create({
      userId,
      programId,
      taskId,
      evaluationType,
      score: aiEvaluation.score || 0,
      maxScore: 100,
      feedback: aiEvaluation.feedback,
      aiAnalysis: {
        strengths: aiEvaluation.strengths,
        improvements: aiEvaluation.improvements,
        ...aiEvaluation
      },
      ksaScores: aiEvaluation.ksaScores,
      timeTakenSeconds: body.timeTaken || 0
    });

    // Update task if provided
    if (taskId && task) {
      await taskRepo.update(taskId, {
        status: 'completed',
        score: aiEvaluation.score,
        completedAt: new Date()
      });

      // Update program progress
      if (task.programId) {
        const programRepo = repositoryFactory.getProgramRepository();
        const program = await programRepo.findById(task.programId);
        
        if (program) {
          const tasks = await taskRepo.findByProgram(task.programId);
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          const totalScore = tasks.reduce((sum, t) => sum + (t.score || 0), 0) / tasks.length;

          await programRepo.update(task.programId, {
            completedTasks,
            totalScore,
            currentTaskIndex: Math.min(task.taskIndex + 1, program.totalTasks - 1)
          });

          // Check if program is completed
          if (completedTasks >= program.totalTasks) {
            await programRepo.updateStatus(task.programId, 'completed');
          }
        }
      }
    }

    // Track AI usage
    await evaluationRepo.trackAIUsage(
      evaluation.id,
      'vertex-ai',
      'gemini-2.5-flash',
      1000, // Estimated tokens
      0.001 // Estimated cost
    );

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}