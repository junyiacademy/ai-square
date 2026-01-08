/**
 * ChatTitleGenerationService
 * Auto-generates chat titles from messages using AI
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface VertexAI {
  preview: {
    getGenerativeModel: (config: {
      model: string;
      generationConfig: {
        maxOutputTokens: number;
        temperature: number;
      };
    }) => {
      generateContent: (prompt: string) => Promise<{
        response: {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                text?: string;
              }>;
            };
          }>;
        };
      }>;
    };
  };
}

export class ChatTitleGenerationService {
  constructor(private vertexAI: VertexAI) {}

  /**
   * Generate chat title from messages
   */
  async generateTitle(messages: ChatMessage[]): Promise<string> {
    if (messages.length < 2) {
      return "New Chat";
    }

    try {
      const model = this.vertexAI.preview.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.7,
        },
      });

      // Use up to 3 messages (first 3 exchanges) for better context
      const conversationContext = messages
        .slice(0, 6) // user, assistant, user, assistant, user, assistant
        .map((msg) => {
          const role = msg.role === "user" ? "User" : "Assistant";
          return `${role}: ${msg.content.substring(0, 150)}`;
        })
        .join("\n");

      const prompt = `Based on this conversation, generate a short, descriptive title in Traditional Chinese (max 6 words, 繁體中文):

${conversationContext}

Generate a title that captures the main topic or question. Examples:
- "AI 素養評估討論"
- "機器學習入門指導"
- "程式設計問題解答"
- "職涯發展建議"

Title:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text =
        response.candidates?.[0]?.content?.parts?.[0]?.text || "學習討論";

      // Remove quotes
      return text.trim().replace(/['"「」]/g, "");
    } catch (error) {
      console.error("Error generating title:", error);
      return "學習討論";
    }
  }
}
