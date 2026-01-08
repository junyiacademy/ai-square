import { NextRequest, NextResponse } from "next/server";
import { ScenarioEditorRepository } from "@/lib/repositories/ScenarioEditorRepository";
import * as yaml from "js-yaml";
import fs from "fs/promises";
import path from "path";

const repository = new ScenarioEditorRepository();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/scenarios/editor/[id] - Get single scenario
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;

  try {
    const scenario = await repository.findById(params.id);

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenario" },
      { status: 500 },
    );
  }
}

// PUT /api/scenarios/editor/[id] - Update scenario
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;

  try {
    const body = await request.json();
    const { scenario, saveToDb, saveToYml } = body;

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario data is required" },
        { status: 400 },
      );
    }

    let updatedScenario = null;

    // Save to database if requested
    if (saveToDb !== false) {
      updatedScenario = await repository.update(params.id, scenario);
    }

    // Export to YML if requested
    if (saveToYml) {
      // Get the scenario data
      const scenarioData =
        updatedScenario || (await repository.findById(params.id));

      if (scenarioData) {
        // Convert to YML format
        const ymlContent = yaml.dump({
          id: scenarioData.scenario_id,
          mode: scenarioData.mode,
          title: scenarioData.title,
          description: scenarioData.description,
          ...scenarioData.content,
        });

        // Save to file
        const ymlPath = path.join(
          process.cwd(),
          "data",
          "scenarios",
          `${scenarioData.scenario_id}.yml`,
        );

        // Create directory if it doesn't exist
        await fs.mkdir(path.dirname(ymlPath), { recursive: true });
        await fs.writeFile(ymlPath, ymlContent, "utf-8");

        // Update yml_path in database
        if (saveToDb !== false) {
          await repository.update(params.id, {
            yml_path: `data/scenarios/${scenarioData.scenario_id}.yml`,
            yml_hash: Buffer.from(ymlContent)
              .toString("base64")
              .substring(0, 64),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      scenario: updatedScenario,
      message: `Saved to: ${[saveToDb !== false && "database", saveToYml && "YML"].filter(Boolean).join(" and ")}`,
    });
  } catch (error) {
    console.error("Error updating scenario:", error);
    return NextResponse.json(
      { error: "Failed to update scenario" },
      { status: 500 },
    );
  }
}

// DELETE /api/scenarios/editor/[id] - Delete scenario
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params;

  try {
    const deleted = await repository.delete(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario" },
      { status: 500 },
    );
  }
}
