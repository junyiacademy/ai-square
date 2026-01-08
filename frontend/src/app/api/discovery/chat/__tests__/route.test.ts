import { NextRequest } from "next/server";
import { POST } from "../route";
import { VertexAI } from "@google-cloud/vertexai";

// Mock VertexAI
jest.mock("@google-cloud/vertexai", () => {
  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      preview: {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn(),
        }),
      },
    })),
  };
});

const mockVertexAI = VertexAI as jest.MockedClass<typeof VertexAI>;

describe("/api/discovery/chat", () => {
  let mockModel: {
    generateContent: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    process.env.GOOGLE_CLOUD_PROJECT = "ai-square-463013";
    process.env.GOOGLE_CLOUD_LOCATION = "us-central1";

    mockModel = {
      generateContent: jest.fn(),
    };

    mockVertexAI.mockImplementation(
      () =>
        ({
          preview: {
            getGenerativeModel: jest.fn().mockReturnValue(mockModel),
          },
        }) as any,
    );
  });

  describe("POST", () => {
    const createMockRequest = (body: unknown): NextRequest => {
      return new NextRequest("http://localhost:3000/api/discovery/chat", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      });
    };

    const mockContext = {
      aiRole: "Career Advisor",
      pathTitle: "Data Science Path",
      currentTask: "Learn Python Basics",
      taskIndex: 1,
      totalTasks: 5,
      currentTaskDescription: "Introduction to Python programming",
      taskProgress: 20,
      completedTasks: 0,
      skills: ["Python", "Data Analysis", "Statistics"],
    };

    describe("Request Validation", () => {
      it("should return 400 when message is missing", async () => {
        const request = createMockRequest({
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({
          error: "Message and context are required",
        });
      });

      it("should return 400 when context is missing", async () => {
        const request = createMockRequest({
          message: "Hello AI!",
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({
          error: "Message and context are required",
        });
      });

      it("should return 400 when message is empty string", async () => {
        const request = createMockRequest({
          message: "",
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({
          error: "Message and context are required",
        });
      });

      it("should handle context with missing properties gracefully", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "我會協助你的！" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: "Hello AI!",
          context: {}, // Empty context will cause error in skills.join()
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200); // Route returns 200 to avoid breaking UI
        expect(body.response).toBe(
          "抱歉，我暫時無法處理你的訊息。請稍後再試，或者繼續探索當前的任務！💪",
        );
      });

      it("should return 400 when message is null", async () => {
        const request = createMockRequest({
          message: null,
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({
          error: "Message and context are required",
        });
      });
    });

    describe("VertexAI Integration", () => {
      it("should initialize VertexAI with correct configuration", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "好的！我會幫助你學習 Python 基礎。" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: "Can you help me learn Python?",
          context: mockContext,
        });

        await POST(request);

        expect(mockVertexAI).toHaveBeenCalledWith({
          project: "ai-square-463013",
          location: "us-central1",
        });
      });

      it("should use environment variables for project and location", async () => {
        process.env.GOOGLE_CLOUD_PROJECT = "custom-project";
        process.env.VERTEX_AI_LOCATION = "asia-northeast1";

        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "好的！" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: "Hello",
          context: mockContext,
        });

        await POST(request);

        expect(mockVertexAI).toHaveBeenCalledWith({
          project: "custom-project",
          location: "asia-northeast1",
        });
      });

      it("should configure the model with correct parameters", async () => {
        const mockGetModel = jest.fn().mockReturnValue(mockModel);
        mockVertexAI.mockImplementation(
          () =>
            ({
              preview: {
                getGenerativeModel: mockGetModel,
              },
            }) as any,
        );

        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "好的！" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: "Hello",
          context: mockContext,
        });

        await POST(request);

        expect(mockGetModel).toHaveBeenCalledWith({
          model: "gemini-2.5-flash",
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
          },
        });
      });
    });

    describe("System Prompt Construction", () => {
      it("should construct proper system prompt with context", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "好的！我會協助你。" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: "How do I start?",
          context: {
            ...mockContext,
            aiRole: "Data Scientist",
            pathTitle: "Machine Learning",
            currentTask: "Linear Regression",
            skills: ["Math", "Python", "Statistics"],
          },
        });

        await POST(request);

        const generateContentCall = mockModel.generateContent.mock.calls[0][0];
        const systemMessage = generateContentCall.contents[0].parts[0].text;

        expect(systemMessage).toContain("You are an AI Data Scientist");
        expect(systemMessage).toContain("Machine Learning");
        expect(systemMessage).toContain("Linear Regression");
        expect(systemMessage).toContain("Math, Python, Statistics");
        expect(systemMessage).toContain("Traditional Chinese");
      });

      it("should include user message in prompt", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "好的！" }],
                },
              },
            ],
          },
        });

        const userMessage = "I need help understanding algorithms";
        const request = createMockRequest({
          message: userMessage,
          context: mockContext,
        });

        await POST(request);

        const generateContentCall = mockModel.generateContent.mock.calls[0][0];
        const userPrompt = generateContentCall.contents[2].parts[0].text;

        expect(userPrompt).toContain(`Student message: ${userMessage}`);
        expect(userPrompt).toContain("Career Advisor");
        expect(userPrompt).toContain("Traditional Chinese");
      });
    });

    describe("Successful Responses", () => {
      it("should return AI response when successful", async () => {
        const aiResponse =
          "好的！我很樂意協助你學習 Python。讓我們從基礎開始吧！🐍";
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: aiResponse }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: "Can you help me learn Python?",
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
          response: aiResponse,
        });
      });

      it("should handle context with all required fields", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "完整的回應內容" }],
                },
              },
            ],
          },
        });

        const complexContext = {
          aiRole: "Senior Data Scientist",
          pathTitle: "Advanced Machine Learning",
          currentTask: "Deep Learning Fundamentals",
          taskIndex: 3,
          totalTasks: 8,
          currentTaskDescription:
            "Understanding neural networks and backpropagation",
          taskProgress: 45,
          completedTasks: 2,
          skills: [
            "Python",
            "TensorFlow",
            "Mathematics",
            "Statistics",
            "Deep Learning",
          ],
        };

        const request = createMockRequest({
          message: "Explain backpropagation in simple terms",
          context: complexContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.response).toBe("完整的回應內容");
      });
    });

    describe("Error Handling", () => {
      it("should handle VertexAI generation errors gracefully", async () => {
        mockModel.generateContent.mockRejectedValue(new Error("API Error"));

        const request = createMockRequest({
          message: "Hello",
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200); // Returns 200 to avoid breaking UI
        expect(body.response).toBe(
          "抱歉，我暫時無法處理你的訊息。請稍後再試，或者繼續探索當前的任務！💪",
        );
      });

      it("should handle empty response from VertexAI", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: "Hello",
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.response).toBe(
          "抱歉，我暫時無法處理你的訊息。請稍後再試，或者繼續探索當前的任務！💪",
        );
      });

      it("should handle missing candidates in response", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: null,
          },
        });

        const request = createMockRequest({
          message: "Hello",
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.response).toBe(
          "抱歉，我暫時無法處理你的訊息。請稍後再試，或者繼續探索當前的任務！💪",
        );
      });

      it("should handle malformed response structure", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {},
        });

        const request = createMockRequest({
          message: "Hello",
          context: mockContext,
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.response).toBe(
          "抱歉，我暫時無法處理你的訊息。請稍後再試，或者繼續探索當前的任務！💪",
        );
      });

      it("should handle JSON parsing errors", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/discovery/chat",
          {
            method: "POST",
            body: "invalid json",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.response).toBe(
          "抱歉，我暫時無法處理你的訊息。請稍後再試，或者繼續探索當前的任務！💪",
        );
      });
    });

    describe("Context Variations", () => {
      it("should handle different AI roles", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "作為軟體工程師，我來協助你。" }],
                },
              },
            ],
          },
        });

        const contextWithDifferentRole = {
          ...mockContext,
          aiRole: "Software Engineer",
          pathTitle: "Full Stack Development",
        };

        const request = createMockRequest({
          message: "How do I build a web app?",
          context: contextWithDifferentRole,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const generateContentCall = mockModel.generateContent.mock.calls[0][0];
        const systemMessage = generateContentCall.contents[0].parts[0].text;
        expect(systemMessage).toContain("Software Engineer");
        expect(systemMessage).toContain("Full Stack Development");
      });

      it("should handle progress at different stages", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "你已經完成了很多！" }],
                },
              },
            ],
          },
        });

        const contextWithHighProgress = {
          ...mockContext,
          taskIndex: 4,
          totalTasks: 5,
          taskProgress: 80,
          completedTasks: 3,
        };

        const request = createMockRequest({
          message: "Almost done!",
          context: contextWithHighProgress,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const generateContentCall = mockModel.generateContent.mock.calls[0][0];
        const systemMessage = generateContentCall.contents[0].parts[0].text;
        expect(systemMessage).toContain("4/5");
        expect(systemMessage).toContain("80%");
        expect(systemMessage).toContain("3");
      });

      it("should handle empty skills array", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "我來協助你開始學習。" }],
                },
              },
            ],
          },
        });

        const contextWithNoSkills = {
          ...mockContext,
          skills: [],
        };

        const request = createMockRequest({
          message: "I am new to this",
          context: contextWithNoSkills,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const generateContentCall = mockModel.generateContent.mock.calls[0][0];
        const systemMessage = generateContentCall.contents[0].parts[0].text;
        expect(systemMessage).toContain("Path Skills: "); // Should still contain the label
      });
    });

    describe("Edge Cases", () => {
      it("should handle very long messages", async () => {
        const longMessage = "a".repeat(5000);
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "我收到了你的長訊息。" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: longMessage,
          context: mockContext,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });

      it("should handle special characters in message", async () => {
        const specialMessage = "你好！@#$%^&*()_+={}[]|\\:\";'<>?,./~`";
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "我理解你的訊息。" }],
                },
              },
            ],
          },
        });

        const request = createMockRequest({
          message: specialMessage,
          context: mockContext,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });

      it("should handle context with special characters", async () => {
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: "好的！" }],
                },
              },
            ],
          },
        });

        const contextWithSpecialChars = {
          ...mockContext,
          pathTitle: "C++ & Software Development",
          currentTask: "Understanding <memory> & pointers",
          currentTaskDescription:
            "Learn about smart pointers: unique_ptr, shared_ptr, & weak_ptr",
        };

        const request = createMockRequest({
          message: "Help me with C++",
          context: contextWithSpecialChars,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });
    });
  });
});
