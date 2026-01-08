import { NextRequest, NextResponse } from "next/server";
import { VertexAI, SchemaType } from "@google-cloud/vertexai";
import { EvaluateRequestBody, Conversation } from "@/types/pbl-evaluate";
import { ErrorResponse } from "@/types/api";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";
import { LANGUAGE_NAMES } from "@/lib/utils/language";

export async function POST(request: NextRequest) {
  try {
    // Use unified authentication
    const session = await getUnifiedAuth(request);

    if (!session?.user?.email) {
      return NextResponse.json<ErrorResponse>(
        { error: "User authentication required" },
        { status: 401 },
      );
    }

    const {
      conversations,
      task,
      targetDomains,
      focusKSA,
      language = "en",
    }: EvaluateRequestBody = await request.json();

    if (!conversations || !task) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: conversations and task are required",
        },
        { status: 400 },
      );
    }

    console.log(
      "Evaluating task:",
      task.id,
      "with",
      conversations.length,
      "conversations",
    );

    // Get target language
    const targetLanguage =
      LANGUAGE_NAMES[language as keyof typeof LANGUAGE_NAMES] ||
      LANGUAGE_NAMES["en"];
    const languageCode = language || "en";

    // Prepare the evaluation prompt
    const evaluationPrompt = `
You are an AI literacy education expert evaluating a learner's performance on a PBL (Problem-Based Learning) task.

CRITICAL LANGUAGE REQUIREMENT:
You MUST provide ALL evaluation feedback in ${targetLanguage} language (code: ${languageCode}).
This includes ALL text fields: strengths, improvements, nextSteps, conversation insights quotes and reasons.
DO NOT use English unless the target language is English.

Task Information:
- Title: ${task.title}
- Description: ${task.description}
- Instructions: ${task.instructions?.join(", ")}
- Expected Outcome: ${task.expectedOutcome}
- Target Domains: ${targetDomains?.join(", ") || "All domains"}
- Focus KSA: ${focusKSA?.join(", ") || "All KSA"}

User Messages (learner's input only):
${conversations
  .filter((conv: Conversation) => conv.type === "user")
  .slice(-10)
  .map(
    (conv: Conversation, index: number) =>
      `${index + 1}. ${conv.content.substring(0, 200)}`,
  )
  .join("\n")}

CRITICAL DOMAIN SCORING RULE:
${
  targetDomains && targetDomains.length > 0
    ? `
- ONLY evaluate the following domains: ${targetDomains.join(", ")}
- For domains IN the target list: Score them normally (0-100)
- For domains NOT in the target list: You MUST return -1 (which will be converted to "NA")
- Example: If targetDomains = ['engaging_with_ai', 'creating_with_ai'], then:
  - engaging_with_ai: normal score (0-100)
  - creating_with_ai: normal score (0-100)
  - managing_with_ai: -1 (not in target domains)
  - designing_with_ai: -1 (not in target domains)
`
    : "Evaluate all four domains normally (0-100)"
}

Evaluation Guidelines:
- No meaningful engagement (only greetings like "hi", "hello"): 10-25 points
- Minimal engagement (basic questions, simple statements): 25-40 points
- Basic engagement (shows interest, asks relevant questions): 40-60 points
- Good engagement (thoughtful questions, follows up, explores ideas): 60-75 points
- Excellent engagement (deep exploration, insightful questions): 75-90 points
- Outstanding performance (exceptional understanding, creative approaches): 90-100 points

Note: For research/exploration tasks, value the learning process over "completion"

CRITICAL SCORING RULES:
- The overall score should be the average of KSA scores and domain scores
- For minimal engagement (just greetings), assign scores in the 10-25 range consistently
- All scores must be logically consistent - if overall is 15, individual scores should be similar
- Domain scores should give partial credit for any attempt (minimum 5-10 for trying)

Please evaluate and provide:
1. Overall performance score (0-100): Based on actual effort and task completion

2. Individual KSA scores (0-100 each):
   - Knowledge: Understanding of the task and AI concepts (0 if no demonstration)
   - Skills: Practical application and problem-solving (0 if no demonstration)
   - Attitudes: Engagement, curiosity, and learning mindset (minimum 5 for attempting)

3. Domain scores:
   - For domains IN targetDomains: Score 0-100 based on performance
   - For domains NOT in targetDomains: Return -1 (will be shown as "NA")
   - engaging_with_ai: Quality of AI interaction (if in targetDomains, else -1)
   - creating_with_ai: Creativity in using AI (if in targetDomains, else -1)
   - managing_with_ai: Organization and planning (if in targetDomains, else -1)
   - designing_with_ai: Strategic thinking (if in targetDomains, else -1)

4. Rubrics scores (1-4 levels):
   Level 1: Beginning (starting to explore)
   Level 2: Developing (showing progress)
   Level 3: Proficient (meeting expectations)
   Level 4: Advanced (exceeding expectations)

5. Conversation Insights:
   - Provide ONLY meaningful insights that add value beyond obvious observations
   - Focus on patterns, approaches, or unique aspects of the learner's engagement
   - Include 1-2 specific quotes as examples only when they illustrate important points
   - If there are no significant insights, return empty arrays
   - DO NOT comment on every message or provide generic feedback like "just said hi"

6. Strengths: 1-2 most significant strengths with KSA codes
7. Areas for improvement: 1-2 key areas with KSA codes
8. Next steps: 1-2 actionable suggestions with KSA codes

Provide a comprehensive evaluation including:
- Overall score (0-100)
- KSA scores for knowledge, skills, and attitudes (0-100 each)
- Domain scores for all four AI literacy domains (0-100 each)
- Rubrics scores for Research Quality, AI Utilization, Content Quality, Learning Progress (1-4 each)
- Conversation insights with specific quotes from learner messages
- Strengths, improvements, and next steps with relevant KSA codes (e.g., K1.1, S2.3)

CRITICAL: You are ONLY evaluating the LEARNER'S messages listed above. Do NOT consider or evaluate the AI assistant's responses.

SPECIAL CASE - MINIMAL ENGAGEMENT:
If the learner only sent greetings or minimal responses:
- Overall score: 15-25 points
- Knowledge: 0-5 (minimal or no knowledge demonstrated)
- Skills: 0-5 (minimal or no skills demonstrated)
- Attitudes: 15-25 (showed willingness to start)
- Domain scores:
  - engaging_with_ai: 10-15 (initiated interaction)
  - Other domains: 0-5 (minimal demonstration)
- Give partial credit for any attempt at engagement

Important evaluation principles:
0. **Mathematical consistency** - Overall score should logically relate to component scores
1. **ONLY evaluate the learner's input messages shown above** - ignore all AI assistant responses completely
2. Consider the **stage type** and **task nature** when evaluating:
   - For research/exploration tasks: Value curiosity, questioning, and discovery process
   - For analysis tasks: Value critical thinking and systematic approach
   - For creation tasks: Value creativity and practical application
   - For practice tasks: Value skill demonstration and improvement
3. **Engagement quality matters more than quantity** - A thoughtful question or insight is valuable
4. Scoring should be based on:
   - Effort and engagement with the learning material
   - Progress toward learning objectives
   - Quality of interaction with AI (asking good questions, iterating on responses)
   - Understanding demonstrated through their responses

REMEMBER: ALL text in your response MUST be in ${targetLanguage}.
This includes strengths, improvements, nextSteps, and conversation insights (both quotes and reasons).
${languageCode !== "en" ? `Do NOT use any English text.` : ""}
`;

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || "ai-square-463013",
      location: process.env.VERTEX_AI_LOCATION || "us-central1",
    });

    // Get the generative model
    const model = vertexAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are a multilingual AI literacy education expert.
CRITICAL: You must ALWAYS respond in the EXACT language specified in the prompt.
Never mix languages. ALL text fields must be in the target language.
For Traditional Chinese (繁體中文), use Traditional Chinese ONLY.
For Simplified Chinese (简体中文), use Simplified Chinese ONLY.`,
    });

    // Call AI for evaluation
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: evaluationPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 65535,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.NUMBER },
            ksaScores: {
              type: SchemaType.OBJECT,
              properties: {
                knowledge: { type: SchemaType.NUMBER },
                skills: { type: SchemaType.NUMBER },
                attitudes: { type: SchemaType.NUMBER },
              },
              required: ["knowledge", "skills", "attitudes"],
            },
            individualKsaScores: { type: SchemaType.OBJECT },
            domainScores: {
              type: SchemaType.OBJECT,
              properties: {
                engaging_with_ai: { type: SchemaType.NUMBER },
                creating_with_ai: { type: SchemaType.NUMBER },
                managing_with_ai: { type: SchemaType.NUMBER },
                designing_with_ai: { type: SchemaType.NUMBER },
              },
              required: [
                "engaging_with_ai",
                "creating_with_ai",
                "managing_with_ai",
                "designing_with_ai",
              ],
            },
            rubricsScores: {
              type: SchemaType.OBJECT,
              properties: {
                "Research Quality": { type: SchemaType.NUMBER },
                "AI Utilization": { type: SchemaType.NUMBER },
                "Content Quality": { type: SchemaType.NUMBER },
                "Learning Progress": { type: SchemaType.NUMBER },
              },
              required: [
                "Research Quality",
                "AI Utilization",
                "Content Quality",
                "Learning Progress",
              ],
            },
            conversationInsights: {
              type: SchemaType.OBJECT,
              properties: {
                effectiveExamples: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      quote: { type: SchemaType.STRING },
                      reason: { type: SchemaType.STRING },
                    },
                    required: ["quote", "reason"],
                  },
                },
                improvementAreas: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      quote: { type: SchemaType.STRING },
                      suggestion: { type: SchemaType.STRING },
                    },
                    required: ["quote", "suggestion"],
                  },
                },
              },
              required: ["effectiveExamples", "improvementAreas"],
            },
            strengths: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            improvements: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            nextSteps: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: [
            "score",
            "ksaScores",
            "domainScores",
            "rubricsScores",
            "conversationInsights",
            "strengths",
            "improvements",
            "nextSteps",
          ],
        },
      },
    });

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON response - should be clean JSON due to responseSchema
    let evaluation;
    try {
      evaluation = JSON.parse(text);
      console.log("Successfully parsed evaluation response");
      console.log(
        "AI Response - domainScores:",
        JSON.stringify(evaluation.domainScores || {}, null, 2),
      );
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", text);

      // Fallback evaluation (conservative scoring)
      evaluation = {
        score: 20,
        ksaScores: {
          knowledge: 20,
          skills: 20,
          attitudes: 20,
        },
        individualKsaScores: {},
        domainScores: {
          engaging_with_ai: 20,
          creating_with_ai: 20,
          managing_with_ai: 20,
          designing_with_ai: 20,
        },
        rubricsScores: {
          "Research Quality": 1,
          "AI Utilization": 1,
          "Content Quality": 1,
          "Learning Progress": 1,
        },
        conversationInsights: {
          effectiveExamples: [],
          improvementAreas: [
            {
              quote:
                conversations.filter((c: Conversation) => c.type === "user")[0]
                  ?.content || "No message",
              suggestion:
                "Instead of just greeting, try asking a specific question about the task",
            },
          ],
        },
        strengths: ["Initiated contact with learning system (A1.1)"],
        improvements: [
          "Need to engage more meaningfully with learning content (K1.1)",
          "Ask specific questions related to the task (S1.1)",
        ],
        nextSteps: [
          "Read the task instructions carefully (K1.1)",
          "Formulate questions about the learning objectives (S1.1, A1.1)",
        ],
      };
    }

    // Process domain scores: Convert -1 to undefined for "NA" display
    if (evaluation.domainScores) {
      const processedDomainScores: Record<string, number | undefined> = {};
      for (const [domain, score] of Object.entries(evaluation.domainScores)) {
        // If score is -1, it means the domain is not in targetDomains
        processedDomainScores[domain] =
          score === -1 ? undefined : (score as number);
      }
      evaluation.domainScores = processedDomainScores;
    }

    // Add timestamp and metadata
    const evaluationResult = {
      ...evaluation,
      evaluatedAt: new Date().toISOString(),
      taskId: task.id,
      conversationCount: conversations.filter(
        (c: Conversation) => c.type === "user",
      ).length,
      targetDomains: targetDomains || [],
    };

    return NextResponse.json({
      success: true,
      evaluation: evaluationResult,
    });
  } catch (error) {
    console.error("Error in evaluation:", error);

    // Provide more detailed error information
    let errorMessage = "Failed to evaluate";
    const statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error details:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: statusCode },
    );
  }
}
