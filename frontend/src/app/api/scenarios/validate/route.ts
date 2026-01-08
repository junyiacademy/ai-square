/**
 * API Route: /api/scenarios/validate
 * Validates YAML scenario files using Zod schemas
 */

import { NextRequest, NextResponse } from "next/server";
import * as yaml from "js-yaml";
import {
  validateScenario,
  getSchemaByMode,
} from "@/lib/validators/scenario-schema";
import type {
  ValidateScenarioRequest,
  ValidateScenarioResponse,
  ValidationError,
} from "@/types/prompt-to-course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scenarios/validate
 * Validate YAML scenario structure and content
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ValidateScenarioResponse | { error: string }>> {
  try {
    // Parse request body
    const body = (await request.json()) as ValidateScenarioRequest;

    if (!body.yaml) {
      return NextResponse.json(
        { error: "Missing YAML content" },
        { status: 400 },
      );
    }

    const { yaml: yamlContent, mode } = body;

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // Step 1: Parse YAML
    let parsedData: unknown;
    try {
      parsedData = yaml.load(yamlContent);
    } catch (yamlError) {
      const error = yamlError as Error;
      return NextResponse.json({
        valid: false,
        errors: [
          {
            path: "root",
            message: `YAML parsing error: ${error.message}`,
            severity: "error" as const,
          },
        ],
        warnings: [],
        info: [],
      });
    }

    // Step 2: Validate with Zod schema
    const validationResult = validateScenario(parsedData);

    if (!validationResult.success && validationResult.errors) {
      errors.push(
        ...validationResult.errors.map((err) => ({
          path: err.path,
          message: err.message,
          severity: "error" as const,
        })),
      );
    }

    // Step 3: Additional validations
    if (validationResult.success && validationResult.data) {
      const data = validationResult.data;

      // Check if mode matches expected mode
      if (mode && data.mode !== mode) {
        warnings.push({
          path: "mode",
          message: `Mode mismatch: expected ${mode}, got ${data.mode}`,
          severity: "warning",
        });
      }

      // Check task count consistency
      if (data.taskCount && data.taskTemplates.length !== data.taskCount) {
        warnings.push({
          path: "taskCount",
          message: `Task count mismatch: taskCount is ${data.taskCount}, but ${data.taskTemplates.length} task templates found`,
          severity: "warning",
        });
      }

      // Check multilingual completeness
      const titleLanguages = Object.keys(data.title);
      const descriptionLanguages = Object.keys(data.description);

      if (titleLanguages.length < 2) {
        warnings.push({
          path: "title",
          message: "Title should include at least 2 languages (en, zhTW)",
          severity: "warning",
        });
      }

      if (descriptionLanguages.length < 2) {
        warnings.push({
          path: "description",
          message: "Description should include at least 2 languages (en, zhTW)",
          severity: "warning",
        });
      }

      // Check if objectives are set
      if (Array.isArray(data.objectives) && data.objectives.length === 0) {
        warnings.push({
          path: "objectives",
          message: "No learning objectives defined",
          severity: "warning",
        });
      }

      // Check prerequisites
      if (data.prerequisites.length === 0) {
        info.push({
          path: "prerequisites",
          message:
            "No prerequisites defined (this scenario can be taken by beginners)",
          severity: "info",
        });
      }

      // Check estimated time
      if (data.estimatedMinutes < 10) {
        warnings.push({
          path: "estimatedMinutes",
          message: "Estimated time is very short (< 10 minutes)",
          severity: "warning",
        });
      }

      if (data.estimatedMinutes > 240) {
        warnings.push({
          path: "estimatedMinutes",
          message: "Estimated time is very long (> 4 hours)",
          severity: "warning",
        });
      }

      // Mode-specific validations
      if (data.mode === "pbl") {
        if (!data.pblData || Object.keys(data.pblData).length === 0) {
          errors.push({
            path: "pblData",
            message: "PBL scenario must have pblData with scenario and stages",
            severity: "error",
          });
        }
      }

      if (data.mode === "discovery") {
        if (
          !data.discoveryData ||
          Object.keys(data.discoveryData).length === 0
        ) {
          errors.push({
            path: "discoveryData",
            message:
              "Discovery scenario must have discoveryData with career information",
            severity: "error",
          });
        }
      }

      if (data.mode === "assessment") {
        if (
          !data.assessmentData ||
          Object.keys(data.assessmentData).length === 0
        ) {
          errors.push({
            path: "assessmentData",
            message:
              "Assessment scenario must have assessmentData with domains and question types",
            severity: "error",
          });
        }
      }

      // Info messages
      info.push({
        path: "root",
        message: `Successfully validated ${data.mode} scenario with ${data.taskTemplates.length} tasks`,
        severity: "info",
      });
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    });
  } catch (error) {
    console.error("Error validating scenario:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate scenario",
      },
      { status: 500 },
    );
  }
}
