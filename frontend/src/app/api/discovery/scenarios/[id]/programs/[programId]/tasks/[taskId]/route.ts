import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { 
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
  getScenarioRepository 
} from '@/lib/implementations/gcs-v2';
import { IInteraction, ITask } from '@/types/unified-learning';
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
      evaluation: task.evaluation,
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
      const careerType = (scenario?.sourceRef.metadata?.careerType as string) || 'unknown';
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
        
        // Don't create evaluation or mark complete yet - wait for user confirmation
        // Just return the result
        return NextResponse.json({
          success: true,
          completed: evaluationResult.completed,
          feedback: evaluationResult.feedback,
          strengths: evaluationResult.strengths || [],
          improvements: evaluationResult.improvements || [],
          xpEarned: evaluationResult.xpEarned || 0,
          canComplete: evaluationResult.completed // Indicate task can be completed
        });
      } catch (aiError) {
        console.error('AI evaluation error:', aiError);
        // Return error response without creating evaluation
        return NextResponse.json({
          success: false,
          error: 'AI evaluation failed',
          feedback: '評估時發生錯誤，請稍後再試。',
          canComplete: false
        });
      }
    } else if (action === 'confirm-complete') {
      // User confirms task completion
      // First check if task has any passed interactions
      const hasPassedInteraction = task.interactions.some(
        i => i.type === 'ai_response' && (i.content as any).completed === true
      );
      
      if (!hasPassedInteraction) {
        return NextResponse.json(
          { error: 'Task has not been passed yet' },
          { status: 400 }
        );
      }
      
      // Create comprehensive evaluation based on all interactions
      const userAttempts = task.interactions.filter(i => i.type === 'user_input').length;
      const aiResponses = task.interactions.filter(i => i.type === 'ai_response');
      
      // Debug log
      console.log('Task interactions for completion:', {
        taskId,
        userAttempts,
        aiResponseCount: aiResponses.length,
        aiResponseDetails: aiResponses.map(r => ({
          timestamp: r.timestamp,
          completed: r.content?.completed,
          content: r.content
        }))
      });
      
      const passedAttempts = aiResponses.filter(
        i => i.content?.completed === true
      ).length;
      
      // Get all feedback for comprehensive review
      const allFeedback = task.interactions
        .filter(i => i.type === 'ai_response')
        .map(i => i.content);
      
      // Calculate total XP from best attempt
      const bestXP = Math.max(
        ...allFeedback.map(f => f.xpEarned || 0),
        task.content.context?.xp || 100
      );
      
      // Generate comprehensive feedback
      const comprehensiveFeedback = `經過 ${userAttempts} 次嘗試，你成功完成了這個任務！${
        userAttempts > 1 
          ? `\n\n學習歷程回顧：\n- 從第一次嘗試到最後，你展現了持續改進的精神\n- 共有 ${passedAttempts} 次達到通過標準\n- 最終掌握了任務所需的核心能力`
          : '\n\n一次就成功完成任務，展現了良好的理解能力！'
      }`;
      
      // Collect all skills improved across attempts
      const allSkillsImproved = new Set<string>();
      allFeedback.forEach(f => {
        if (f.skillsImproved) {
          f.skillsImproved.forEach((skill: string) => allSkillsImproved.add(skill));
        }
      });
      
      // Create formal evaluation record
      const evaluation = await evaluationRepo.create({
        targetType: 'task',
        targetId: taskId,
        evaluationType: 'discovery_task',
        score: bestXP,
        feedback: comprehensiveFeedback,
        dimensions: [],
        metadata: {
          completed: true,
          xpEarned: bestXP,
          totalAttempts: userAttempts,
          passedAttempts: passedAttempts,
          skillsImproved: Array.from(allSkillsImproved),
          learningJourney: allFeedback
        },
        createdAt: new Date().toISOString()
      });
      
      // Mark task as completed and save evaluation ID
      await taskRepo.update(taskId, {
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        evaluation: {
          id: evaluation.id,
          score: evaluation.score,
          feedback: evaluation.feedback,
          evaluatedAt: evaluation.createdAt
        }
      });
      
      // Update program XP
      const currentXP = (program.metadata?.totalXP as number) || 0;
      await programRepo.update(programId, {
        metadata: {
          ...program.metadata,
          totalXP: currentXP + bestXP
        }
      });
      
      // Update program progress
      // Use the task order from program.taskIds to ensure correct sequence
      const allTasks = await taskRepo.findByProgram(programId);
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      
      // Get tasks in the correct order based on program.taskIds
      const orderedTasks = program.taskIds
        .map(id => taskMap.get(id))
        .filter(Boolean) as ITask[];
      
      const completedTasks = orderedTasks.filter(t => t.status === 'completed').length;
      const nextTaskIndex = completedTasks;
      
      // Activate next task if available
      let nextTaskId = null;
      if (nextTaskIndex < orderedTasks.length) {
        const nextTask = orderedTasks[nextTaskIndex];
        await taskRepo.updateStatus(nextTask.id, 'active');
        nextTaskId = nextTask.id;
      }
      
      // Update program current task index
      await programRepo.updateProgress(programId, nextTaskIndex);
      
      // If all tasks completed, complete the program
      if (completedTasks === orderedTasks.length) {
        await programRepo.complete(programId);
        
        // Create program completion evaluation
        await evaluationRepo.create({
          targetType: 'program',
          targetId: programId,
          evaluationType: 'discovery_completion',
          score: 100,
          feedback: 'Congratulations! You have completed all learning tasks in this program.',
          dimensions: [],
          metadata: {
            totalXP: currentXP + bestXP,
            tasksCompleted: orderedTasks.length
          },
          createdAt: new Date().toISOString()
        });
      }
      
      return NextResponse.json({
        success: true,
        taskCompleted: true,
        evaluation: {
          id: evaluation.id,
          score: evaluation.score,
          xpEarned: bestXP,
          feedback: comprehensiveFeedback
        },
        nextTaskId,
        programCompleted: completedTasks === orderedTasks.length
      });
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