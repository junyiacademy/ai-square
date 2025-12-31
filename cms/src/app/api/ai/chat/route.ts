import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/vertex-ai";
import * as yaml from "js-yaml";

export async function POST(request: NextRequest) {
  try {
    const { prompt, content, file } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const systemPrompt = `You are an AI assistant specialized in educational content management for AI literacy platforms.
You help content creators with YAML-based educational content including PBL scenarios, rubrics, and learning materials.

Current context:
- File: ${file || "No file selected"}
- Content type: YAML educational content
- Platform: AI Square CMS

Guidelines:
1. Provide helpful, accurate responses about content editing
2. When suggesting YAML changes, provide valid syntax
3. Consider educational best practices
4. Support multilingual content (9 languages)
5. If user asks for content changes, return the modified content in a clear format
6. Be concise but thorough in explanations

Current file content:
${content || "No content available"}`;

    const response = await generateContent(prompt, systemPrompt);

    // Only auto-update content if user explicitly asks for changes
    let updatedContent = null;
    const updateKeywords = [
      "update",
      "change",
      "modify",
      "replace",
      "fix",
      "correct",
      "更新",
      "修改",
      "替換",
      "修正",
      "改成",
      "改為",
      "set it to",
      "make it",
      "fill in",
      "complete this",
    ];

    const isUpdateRequest = updateKeywords.some((keyword) =>
      prompt.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (
      isUpdateRequest &&
      (response.includes("```yaml") || response.includes("```yml"))
    ) {
      // Extract YAML from response
      const yamlMatch = response.match(/```ya?ml\n([\s\S]*?)\n```/);
      if (yamlMatch) {
        try {
          // Validate YAML syntax
          yaml.load(yamlMatch[1]);
          updatedContent = yamlMatch[1];
        } catch (error) {
          console.warn("Invalid YAML in response:", error);
        }
      }
    }

    return NextResponse.json({
      response,
      updatedContent,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }
}
