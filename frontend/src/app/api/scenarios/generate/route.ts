/**
 * API Route: /api/scenarios/generate
 * Generates YAML scenario files using Vertex AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { getPromptByMode, getSystemPrompt } from '@/lib/prompts/scenario-generator';
import type { GenerateScenarioRequest, GenerateScenarioResponse } from '@/types/prompt-to-course';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/scenarios/generate
 * Generate YAML scenario from user input
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateScenarioResponse | { error: string }>> {
  try {
    // Parse request body
    const body = await request.json() as GenerateScenarioRequest;

    if (!body.input) {
      return NextResponse.json(
        { error: 'Missing input data' },
        { status: 400 }
      );
    }

    const { input } = body;

    // Validate required fields
    if (!input.scenarioId || !input.title || !input.description || !input.mode) {
      return NextResponse.json(
        { error: 'Missing required fields: scenarioId, title, description, mode' },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['pbl', 'discovery', 'assessment'].includes(input.mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be pbl, discovery, or assessment' },
        { status: 400 }
      );
    }

    // Initialize Vertex AI service
    const vertexAI = new VertexAIService({
      model: 'gemini-2.5-flash',
      systemPrompt: getSystemPrompt(),
      temperature: 0.3, // Lower temperature for more consistent YAML structure
      maxOutputTokens: 8192, // Large enough for complete YAML
    });

    // Generate prompt based on mode
    const prompt = getPromptByMode(input);

    // Call Vertex AI
    const startTime = Date.now();
    const response = await vertexAI.sendMessage(prompt);
    const processingTime = Date.now() - startTime;

    // Extract YAML from response (remove any markdown code blocks)
    let yaml = response.content.trim();

    // Remove markdown code blocks if present
    if (yaml.startsWith('```yaml')) {
      yaml = yaml.replace(/^```yaml\n/, '').replace(/\n```$/, '');
    } else if (yaml.startsWith('```')) {
      yaml = yaml.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Basic validation: check if it looks like YAML
    const warnings: string[] = [];
    if (!yaml.includes('mode:') || !yaml.includes('title:')) {
      warnings.push('Generated YAML may be incomplete or invalid');
    }

    // Check for common issues
    if (yaml.includes('```')) {
      warnings.push('Response contains markdown code blocks - cleaned automatically');
    }

    return NextResponse.json({
      yaml,
      processingTime,
      tokensUsed: response.tokensUsed,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error('Error generating scenario:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate scenario',
      },
      { status: 500 }
    );
  }
}
