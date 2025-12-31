import { NextRequest } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "en";

    // Await params before using
    const { id } = await params;

    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const scenario = await scenarioRepo.findById(id);

    if (!scenario) {
      return new Response(JSON.stringify({ error: "Scenario not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get config from taskTemplates if available
    let config;
    if (scenario.taskTemplates && Array.isArray(scenario.taskTemplates)) {
      // Calculate total questions from all tasks
      const totalQuestions = scenario.taskTemplates.reduce((sum, task) => {
        const taskData = task as Record<string, unknown>;
        const content = taskData.content as
          | { questions?: unknown[] }
          | undefined;
        return sum + (content?.questions?.length || 0);
      }, 0);

      // Calculate total time limit from all tasks
      const totalTimeLimit = scenario.taskTemplates.reduce((sum, task) => {
        const taskData = task as Record<string, unknown>;
        const context = taskData.context as { timeLimit?: number } | undefined;
        return sum + Math.floor((context?.timeLimit || 240) / 60);
      }, 0);

      config = {
        totalQuestions: totalQuestions || 12,
        timeLimit: totalTimeLimit || 15,
        passingScore: 60, // Default passing score
        domains: scenario.taskTemplates.map((task) => task.id), // Use task IDs as domains
      };
    } else {
      // Fallback: Use default config
      config = {
        totalQuestions: 12,
        timeLimit: 15,
        passingScore: 60,
        domains: [
          "engaging_with_ai",
          "creating_with_ai",
          "managing_with_ai",
          "designing_with_ai",
        ],
      };
    }

    // Get title and description from scenario
    const title =
      typeof scenario.title === "string"
        ? scenario.title
        : scenario.title?.[lang] || scenario.title?.en || "Assessment";

    const description =
      typeof scenario.description === "string"
        ? scenario.description
        : scenario.description?.[lang] || scenario.description?.en || "";

    const responseData = {
      ...scenario,
      title,
      description,
      config,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in Assessment scenario API:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
