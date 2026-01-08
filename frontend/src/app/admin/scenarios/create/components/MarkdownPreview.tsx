"use client";

/**
 * MarkdownPreview Component
 * Markdown representation of the scenario
 */

import * as yaml from "js-yaml";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ParsedScenarioData } from "@/types/prompt-to-course";

interface MarkdownPreviewProps {
  yaml: string;
}

export function MarkdownPreview({ yaml: yamlContent }: MarkdownPreviewProps) {
  let markdown = "";
  let parseError: string | null = null;

  try {
    const data = yaml.load(yamlContent) as ParsedScenarioData;

    const getMultilingualText = (
      field: Record<string, string> | string | undefined,
      lang = "en",
    ): string => {
      if (!field) return "N/A";
      if (typeof field === "string") return field;
      return field[lang] || field.en || Object.values(field)[0] || "N/A";
    };

    // Generate markdown
    markdown = `# ${getMultilingualText(data.title)}

**Mode:** ${data.mode?.toUpperCase() || "N/A"} | **Difficulty:** ${data.difficulty || "N/A"} | **Estimated Time:** ${data.estimatedMinutes || 0} minutes

## Description

${getMultilingualText(data.description)}

## Tasks (${data.taskTemplates?.length || 0})

${
  data.taskTemplates
    ?.map((task, index) => {
      return `### ${index + 1}. ${getMultilingualText(task.title)}

**Type:** \`${task.type}\`

${task.description ? getMultilingualText(task.description) : ""}
`;
    })
    .join("\n") || "_No tasks defined_"
}

## Metadata

- **Scenario ID:** ${data.id || "N/A"}
- **Version:** ${data.version || "N/A"}
- **Status:** ${data.status || "N/A"}
- **Source Type:** ${data.sourceType || "N/A"}
- **Created:** ${data.createdAt || "N/A"}
- **Updated:** ${data.updatedAt || "N/A"}

${
  data.mode === "pbl" && data.pblData && Object.keys(data.pblData).length > 0
    ? `
## PBL Data

\`\`\`json
${JSON.stringify(data.pblData, null, 2)}
\`\`\`
`
    : ""
}

${
  data.mode === "discovery" &&
  data.discoveryData &&
  Object.keys(data.discoveryData).length > 0
    ? `
## Discovery Data

\`\`\`json
${JSON.stringify(data.discoveryData, null, 2)}
\`\`\`
`
    : ""
}

${
  data.mode === "assessment" &&
  data.assessmentData &&
  Object.keys(data.assessmentData).length > 0
    ? `
## Assessment Data

\`\`\`json
${JSON.stringify(data.assessmentData, null, 2)}
\`\`\`
`
    : ""
}
`;
  } catch (error) {
    parseError =
      error instanceof Error ? error.message : "Failed to parse YAML";
    markdown = `# Parse Error\n\n\`\`\`\n${parseError}\n\`\`\``;
  }

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
