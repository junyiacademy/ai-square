/**
 * API to rebuild scenario index
 * POST /api/scenarios/index/rebuild
 */

import { NextResponse } from "next/server";
import { scenarioIndexBuilder } from "@/lib/services/scenario-index-builder";

export async function POST() {
  try {
    console.log("[Scenario Index] Rebuilding index...");

    // Force rebuild the index
    await scenarioIndexBuilder.buildFullIndex();

    // Get the current status
    const status = scenarioIndexBuilder.getStatus();

    return NextResponse.json({
      success: true,
      message: "Scenario index rebuilt successfully",
      status,
    });
  } catch (error) {
    console.error("[Scenario Index] Error rebuilding index:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to rebuild scenario index",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
