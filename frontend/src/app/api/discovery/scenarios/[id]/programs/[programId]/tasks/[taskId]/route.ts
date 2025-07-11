import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { 
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
  getScenarioRepository 
} from '@/lib/implementations/gcs-v2';
import { IInteraction } from '@/types/unified-learning';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';

// GET a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId, programId, taskId } = await params;
    const userEmail = session.user.email;
    
    // Get repositories
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const scenarioRepo = getScenarioRepository();
    
    // Verify program ownership
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get task
    const task = await taskRepo.findById(taskId);
    if (!task || task.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Load scenario for career info
    const scenario = await scenarioRepo.findById(program.scenarioId);
    
    // Return task data
    return NextResponse.json({
      id: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
      content: task.content,
      interactions: task.interactions,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      // Add career info
      careerType: scenario?.sourceRef.metadata?.careerType || 'unknown',
      scenarioTitle: scenario?.title || 'Discovery Scenario'
    });
  } catch (error) {
    console.error('Error in GET task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update task (submit response, update status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programId, taskId } = await params;
    const userEmail = session.user.email;
    
    const body = await request.json();
    const { action, content } = body;
    
    // Get repositories
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const evaluationRepo = getEvaluationRepository();
    
    // Verify program ownership
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get task
    const task = await taskRepo.findById(taskId);
    if (!task || task.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    if (action === 'submit') {
      // Add user response as interaction
      const userInteraction: IInteraction = {
        timestamp: new Date().toISOString(),
        type: 'user_input',
        content: {
          response: content.response,
          timeSpent: content.timeSpent
        }
      };
      
      await taskRepo.addInteraction(taskId, userInteraction);
      
      // Get repositories for scenario lookup
      const scenarioRepo = getScenarioRepository();
      
      // Get scenario for context
      const scenario = await scenarioRepo.findById(program.scenarioId);
      const careerType = scenario?.sourceRef.metadata?.careerType || 'unknown';
      const language = program.metadata?.language || 'zhTW';
      
      // Load YAML data for world setting context
      let yamlData = null;
      if (careerType !== 'unknown') {
        yamlData = await DiscoveryYAMLLoader.loadPath(careerType, language as 'en' | 'zhTW');
      }
      
      // Use AI to evaluate the response
      const aiService = new VertexAIService({
        systemPrompt: 'You are an AI learning evaluator in a discovery-based learning environment.',
        temperature: 0.7,
        model: 'gemini-2.5-flash'
      });
      
      // Prepare evaluation prompt
      const evaluationPrompt = `
You are an AI learning evaluator in a discovery-based learning environment.

Career Path: ${careerType}
Task Title: ${task.title}
Task Instructions: ${task.content.instructions}
Task Context: ${JSON.stringify(task.content.context || {})}
${yamlData ? `World Setting: ${yamlData.world_setting.description}\nAtmosphere: ${yamlData.world_setting.atmosphere}` : ''}

Learner's Response:
${content.response}

Please evaluate this response considering:
1. Understanding of the task requirements
2. Depth of analysis or quality of creation
3. Creativity and original thinking
4. Practical application of concepts
5. Evidence of learning and growth

Provide your evaluation in Traditional Chinese (繁體中文) with:
- Detailed feedback explaining what was done well and areas for improvement
- Whether the task is completed satisfactorily
- XP points earned (0-${task.content.context?.xp || 100})
- Skills that were demonstrated or improved

Return your evaluation as a JSON object:
{
  "feedback": "詳細的中文回饋",
  "strengths": ["優點1", "優點2"],
  "improvements": ["改進建議1", "改進建議2"],
  "completed": true/false,
  "xpEarned": number (0-${task.content.context?.xp || 100}),
  "skillsImproved": ["技能1", "技能2"]
}`;

      try {
        const aiResponse = await aiService.sendMessage(evaluationPrompt);
        
        // Parse JSON from AI response
        let evaluationResult;
        try {
          // Extract JSON from the response (AI might include markdown code blocks)
          const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            evaluationResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in AI response');
          }
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError);
          // Fallback evaluation
          evaluationResult = {
            feedback: aiResponse.content,
            completed: true,
            xpEarned: task.content.context?.xp || 100,
            strengths: [],
            improvements: [],
            skillsImproved: []
          };
        }
        
        // Add AI evaluation as interaction
        const aiInteraction: IInteraction = {
          timestamp: new Date().toISOString(),
          type: 'ai_response',
          content: evaluationResult
        };
        
        await taskRepo.addInteraction(taskId, aiInteraction);
        
        // Only mark task as completed if AI says so
        if (evaluationResult.completed) {
          await taskRepo.complete(taskId);
          
          // Update program XP
          const currentXP = (program.metadata?.totalXP as number) || 0;
          await programRepo.update(programId, {
            metadata: {
              ...program.metadata,
              totalXP: currentXP + (evaluationResult.xpEarned || 0)
            }
          });
        }
        
        // Create evaluation record
        const evaluation = await evaluationRepo.create({
          targetType: 'task',
          targetId: taskId,
          evaluationType: 'discovery_task',
          score: evaluationResult.xpEarned || 0,
          feedback: evaluationResult.feedback,
          dimensions: [],
          metadata: {
            completed: evaluationResult.completed,
            xpEarned: evaluationResult.xpEarned || 0,
            completionTime: content.timeSpent,
            strengths: evaluationResult.strengths || [],
            improvements: evaluationResult.improvements || [],
            skillsImproved: evaluationResult.skillsImproved || []
          },
          createdAt: new Date().toISOString()
        });
      
      // Update program progress
      const tasks = await taskRepo.findByProgram(programId);
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const nextTaskIndex = completedTasks;
      
      // Activate next task if available
      if (nextTaskIndex < tasks.length) {
        const nextTask = tasks[nextTaskIndex];
        await taskRepo.updateStatus(nextTask.id, 'active');
      }
      
      // Update program current task index
      await programRepo.updateProgress(programId, nextTaskIndex);
      
      // If all tasks completed, complete the program
      if (completedTasks === tasks.length) {
        await programRepo.complete(programId);
        
        // Create program completion evaluation
        await evaluationRepo.create({
          targetType: 'program',
          targetId: programId,
          evaluationType: 'discovery_completion',
          score: 100,
          feedback: 'Congratulations! You have completed all tasks.',
          dimensions: [],
          metadata: {
            totalXP: program.metadata?.totalXP || 0,
            tasksCompleted: tasks.length
          },
          createdAt: new Date().toISOString()
        });
      }
        
        return NextResponse.json({
          success: true,
          completed: evaluationResult.completed,
          feedback: evaluationResult.feedback,
          strengths: evaluationResult.strengths || [],
          improvements: evaluationResult.improvements || [],
          xpEarned: evaluationResult.xpEarned || 0,
          evaluation: {
            id: evaluation.id,
            score: evaluation.score,
            xpEarned: evaluation.metadata?.xpEarned || 0
          },
          nextTaskId: evaluationResult.completed && nextTaskIndex < tasks.length ? tasks[nextTaskIndex].id : null
        });
      } catch (aiError) {
        console.error('AI evaluation error:', aiError);
        // Fallback to simple completion without AI evaluation
        await taskRepo.complete(taskId);
        
        const evaluation = await evaluationRepo.create({
          targetType: 'task',
          targetId: taskId,
          evaluationType: 'discovery_task',
          score: task.content.context?.xp || 100,
          feedback: '任務已完成！',
          dimensions: [],
          metadata: {
            xpEarned: task.content.context?.xp || 100,
            completionTime: content.timeSpent,
            aiError: true
          },
          createdAt: new Date().toISOString()
        });
        
        // Update program progress
        const tasks = await taskRepo.findByProgram(programId);
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const nextTaskIndex = completedTasks;
        
        // Activate next task if available
        if (nextTaskIndex < tasks.length) {
          const nextTask = tasks[nextTaskIndex];
          await taskRepo.updateStatus(nextTask.id, 'active');
        }
        
        // Update program current task index
        await programRepo.updateProgress(programId, nextTaskIndex);
        
        return NextResponse.json({
          success: true,
          completed: true,
          feedback: '任務已完成！繼續努力！',
          xpEarned: task.content.context?.xp || 100,
          evaluation: {
            id: evaluation.id,
            score: evaluation.score,
            xpEarned: evaluation.metadata?.xpEarned || 0
          },
          nextTaskId: nextTaskIndex < tasks.length ? tasks[nextTaskIndex].id : null
        });
      }
    } else if (action === 'start') {
      // Mark task as active
      await taskRepo.updateStatus(taskId, 'active');
      
      return NextResponse.json({
        success: true,
        status: 'active'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in PATCH task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}