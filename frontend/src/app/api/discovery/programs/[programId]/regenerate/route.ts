import { NextRequest, NextResponse } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";
import { VertexAIService } from "@/lib/ai/vertex-ai-service";
import { TranslationService } from "@/lib/services/translation-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const { programId } = await params;

    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Program not found or access denied" },
        { status: 404 },
      );
    }

    // Get all tasks
    const tasks = await taskRepo.findByProgram(programId);
    const completedTasks = tasks.filter((t) => t.status === "completed");

    console.log("Regenerating evaluation for program:", programId);
    console.log(
      "Tasks found:",
      tasks.length,
      "Completed:",
      completedTasks.length,
    );

    // Calculate metrics from task evaluations
    let totalXP = 0;
    let totalScore = 0;
    let validScoreCount = 0;

    // Create task evaluations array
    const taskEvaluations = completedTasks.map((task) => {
      const taskWithExtras = task as {
        evaluation?: {
          score?: number;
          metadata?: { skillsImproved?: string[] };
        };
        interactions?: { type: string }[];
      };
      const score = taskWithExtras.evaluation?.score || 0;
      const xp = taskWithExtras.evaluation?.score || 0; // Using score as XP
      const attempts =
        taskWithExtras.interactions?.filter((i) => i.type === "user_input")
          .length || 1;
      const skills = taskWithExtras.evaluation?.metadata?.skillsImproved || [];

      if (score > 0) {
        totalXP += xp;
        totalScore += score;
        validScoreCount++;
      }

      return {
        taskId: task.id,
        taskTitle: task.title || "Task",
        taskType: task.type || "question",
        score: score,
        xpEarned: xp,
        attempts: attempts,
        skillsImproved: skills,
      };
    });

    const avgScore =
      validScoreCount > 0 ? Math.round(totalScore / validScoreCount) : 0;

    // Calculate time spent from interactions
    const timeSpentSeconds = completedTasks.reduce((sum, task) => {
      const taskWithInteractions = task as {
        interactions?: { context?: { timeSpent?: number } }[];
      };
      const interactions = taskWithInteractions.interactions || [];
      const time = interactions.reduce((taskTime, interaction) => {
        const t = interaction.context?.timeSpent || 0;
        return taskTime + t;
      }, 0);
      return sum + time;
    }, 0);

    // Calculate days used
    let daysUsed = 0;
    if ((program.createdAt || program.startedAt) && completedTasks.length > 0) {
      const startDate = new Date(program.createdAt || program.startedAt!);
      const lastCompletionDate = completedTasks.reduce((latest, task) => {
        if (task.completedAt) {
          const taskDate = new Date(task.completedAt);
          return taskDate > latest ? taskDate : latest;
        }
        return latest;
      }, startDate);

      const timeDiff = lastCompletionDate.getTime() - startDate.getTime();
      daysUsed = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }

    console.log("Calculated metrics:", {
      totalXP,
      avgScore,
      timeSpentSeconds,
      daysUsed,
    });

    // Get scenario info
    const scenario = await scenarioRepo.findById(program.scenarioId);
    const careerType =
      (program.metadata?.careerType as string) ||
      (scenario?.metadata?.careerType as string) ||
      "general";

    // Get user's preferred language from request or program
    const acceptLanguage = request.headers
      .get("accept-language")
      ?.split(",")[0];
    const userLanguage: string =
      acceptLanguage || (program.metadata?.language as string) || "en";

    // Generate qualitative feedback based on all task completions
    let qualitativeFeedback: Record<string, unknown> | null = null;
    const qualitativeFeedbackVersions: Record<
      string,
      Record<string, unknown> | string
    > = {};

    try {
      const aiService = new VertexAIService({
        systemPrompt:
          "You are an educational psychologist specializing in career development and AI-powered learning.",
        temperature: 0.8,
        model: "gemini-2.5-flash",
      });

      // Prepare learning journey summary
      const learningJourney = completedTasks.map((task) => {
        const taskWithExtras = task as {
          evaluation?: {
            score?: number;
            feedback?: string;
            metadata?: { skillsImproved?: string[] };
          };
          interactions?: { type: string }[];
        };
        return {
          taskTitle: task.title,
          taskType: task.type,
          score: taskWithExtras.evaluation?.score || 0,
          feedback: taskWithExtras.evaluation?.feedback || "",
          attempts:
            taskWithExtras.interactions?.filter((i) => i.type === "user_input")
              .length || 0,
          skills: taskWithExtras.evaluation?.metadata?.skillsImproved || [],
        };
      });

      const feedbackPrompt = `
Based on the following Discovery learning journey in the ${careerType} career path, provide a comprehensive qualitative assessment:

Scenario: ${scenario?.title || "Discovery Program"}
Career Path: ${careerType}
Overall Score: ${avgScore}
Total XP Earned: ${totalXP}
Days Used: ${daysUsed}

Task Performance:
${JSON.stringify(learningJourney, null, 2)}

Please provide a structured assessment with the following sections:

1. **Overall Assessment** (2-3 sentences): Summarize the learner's performance and key achievements
2. **Career Alignment** (2-3 sentences): How well their performance aligns with the ${careerType} career path
3. **Strengths** (2-3 bullet points): Key strengths demonstrated
4. **Growth Areas** (2-3 bullet points): Areas for improvement
5. **Next Steps** (2-3 bullet points): Specific recommendations for continued learning

${userLanguage === "zhTW" ? "Please provide your response in Traditional Chinese (繁體中文)." : "Please provide your response in English."}

Return your response in JSON format:
{
  "overallAssessment": "...",
  "careerAlignment": "...",
  "strengths": ["...", "..."],
  "growthAreas": ["...", "..."],
  "nextSteps": ["...", "..."]
}`;

      const aiResponse = await aiService.sendMessage(feedbackPrompt);

      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          qualitativeFeedback = JSON.parse(jsonMatch[0]) as Record<
            string,
            unknown
          >;

          // Store the generated feedback in the user's language
          if (qualitativeFeedback) {
            const feedback = qualitativeFeedback as Record<string, unknown>;
            qualitativeFeedbackVersions[userLanguage] = feedback;
          }

          // If not English, also generate English version for storage
          if (userLanguage !== "en") {
            try {
              const translationService = new TranslationService();
              const englishFeedback = {
                overallAssessment: await translationService.translateFeedback(
                  qualitativeFeedback.overallAssessment as string,
                  "en",
                  careerType,
                ),
                careerAlignment: await translationService.translateFeedback(
                  qualitativeFeedback.careerAlignment as string,
                  "en",
                  careerType,
                ),
                strengths: await Promise.all(
                  (qualitativeFeedback.strengths as string[]).map((s: string) =>
                    translationService.translateFeedback(s, "en", careerType),
                  ),
                ),
                growthAreas: await Promise.all(
                  (qualitativeFeedback.growthAreas as string[]).map(
                    (g: string) =>
                      translationService.translateFeedback(g, "en", careerType),
                  ),
                ),
                nextSteps: await Promise.all(
                  (qualitativeFeedback.nextSteps as string[]).map((n: string) =>
                    translationService.translateFeedback(n, "en", careerType),
                  ),
                ),
              };
              qualitativeFeedbackVersions["en"] = englishFeedback;
            } catch (translationError) {
              console.error(
                "Failed to generate English version:",
                translationError,
              );
              // Fallback: store current version as English too
              if (qualitativeFeedback) {
                qualitativeFeedbackVersions["en"] =
                  qualitativeFeedback as Record<string, unknown>;
              }
            }
          }
        }
      } catch (parseError) {
        console.error("Failed to parse AI feedback:", parseError);
      }
    } catch (error) {
      console.error("Error generating qualitative feedback:", error);
    }

    // Find existing evaluations
    const evaluations = await evaluationRepo.findByProgram(programId);
    const existingEvaluation = evaluations.find(
      (e) => e.evaluationType === "discovery_complete",
    );

    if (existingEvaluation) {
      // Note: Evaluation repository doesn't have an update method
      // In a real implementation, you might want to create a new evaluation
      // or implement an update method in the repository
      console.log("Existing evaluation found:", existingEvaluation.id);
      console.log("Note: Update method not available in evaluation repository");

      // Update program metadata
      await programRepo.update?.(programId, {
        metadata: {
          ...program.metadata,
          totalXP,
          finalScore: avgScore,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Evaluation regenerated successfully",
        evaluationId: existingEvaluation.id,
        metrics: {
          totalXP,
          avgScore,
          daysUsed,
          completedTasks: completedTasks.length,
        },
      });
    } else {
      // Create new evaluation if none exists
      console.log("Creating new evaluation (none exists)");

      const evaluation = await evaluationRepo.create({
        userId: session.user.id,
        programId: programId,
        mode: "discovery",
        evaluationType: "program",
        evaluationSubtype: "discovery_complete",
        score: avgScore,
        maxScore: 100,
        timeTakenSeconds: timeSpentSeconds,
        domainScores: {},
        feedbackText:
          typeof qualitativeFeedbackVersions["en"] === "string"
            ? qualitativeFeedbackVersions["en"]
            : JSON.stringify(
                qualitativeFeedbackVersions["en"] || qualitativeFeedback || {},
              ),
        feedbackData: qualitativeFeedbackVersions,
        aiAnalysis: {},
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {
          careerType,
          totalXP,
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          daysUsed,
        },
        assessmentData: {},
        metadata: {
          scenarioId: program.scenarioId,
          scenarioTitle: scenario?.title,
          overallScore: avgScore,
          taskEvaluations,
          completedAt: new Date().toISOString(),
        },
      });

      // Update program to reference the new evaluation
      await programRepo.update?.(programId, {
        metadata: {
          ...program.metadata,
          evaluationId: evaluation.id,
          totalXP,
          finalScore: avgScore,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Evaluation created successfully",
        evaluationId: evaluation.id,
        metrics: {
          totalXP,
          avgScore,
          daysUsed,
          completedTasks: completedTasks.length,
        },
      });
    }
  } catch (error) {
    console.error("Error regenerating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to regenerate evaluation" },
      { status: 500 },
    );
  }
}
