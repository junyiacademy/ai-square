import { NextRequest, NextResponse } from "next/server";
import { GET } from "../route";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

jest.mock("@/lib/repositories/base/repository-factory");
jest.mock("@/lib/api/optimization-utils", () => ({
  cachedGET: jest.fn(async (req, fn) => {
    const result = await fn();
    return NextResponse.json(result);
  }),
  getPaginationParams: jest.fn(() => ({ page: 1, limit: 10 })),
  createPaginatedResponse: jest.fn((data) => ({ data, total: data.length })),
  parallel: jest.fn((...promises) => Promise.all(promises)),
}));

describe("GET /api/pbl/history", () => {
  const mockRepos = {
    user: {
      findByEmail: jest.fn(),
    },
    program: {
      findByUser: jest.fn(),
    },
    task: {
      findByProgram: jest.fn(),
    },
    evaluation: {
      findByProgram: jest.fn(),
    },
    content: {
      getScenarioContent: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(
      mockRepos.user,
    );
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(
      mockRepos.program,
    );
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(
      mockRepos.task,
    );
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(
      mockRepos.evaluation,
    );
    Object.assign(repositoryFactory, {
      getUserRepository: jest.fn().mockReturnValue(mockRepos.user),
      getProgramRepository: jest.fn().mockReturnValue(mockRepos.program),
      getTaskRepository: jest.fn().mockReturnValue(mockRepos.task),
      getEvaluationRepository: jest.fn().mockReturnValue(mockRepos.evaluation),
      getContentRepository: jest.fn().mockReturnValue(mockRepos.content),
    });
  });

  it("should return history for authenticated user", async () => {
    mockRepos.user.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });
    mockRepos.program.findByUser.mockResolvedValue([
      {
        id: "prog-1",
        scenarioId: "scenario-1",
        status: "completed",
        startedAt: "2024-01-01",
        lastActivityAt: "2024-01-02",
        completedAt: "2024-01-02",
        totalTaskCount: 5,
        timeSpentSeconds: 3600,
      },
    ]);
    mockRepos.task.findByProgram.mockResolvedValue([
      { id: "task-1", status: "completed", taskIndex: 0, score: 85 },
    ]);
    mockRepos.evaluation.findByProgram.mockResolvedValue([
      { id: "eval-1", score: 85, domainScores: { domain1: 90 } },
    ]);
    mockRepos.content.getScenarioContent.mockResolvedValue({
      title: { en: "Test Scenario" },
    });

    const request = new NextRequest("http://localhost:3000/api/pbl/history");
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].programId).toBe("prog-1");
  });

  it("should return 401 for unauthenticated user", async () => {
    const request = new NextRequest("http://localhost:3000/api/pbl/history");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("User authentication required");
  });

  it("should filter by scenarioId", async () => {
    mockRepos.user.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });
    mockRepos.program.findByUser.mockResolvedValue([
      {
        id: "prog-1",
        scenarioId: "scenario-1",
        status: "completed",
        totalTaskCount: 5,
        createdAt: "2024-01-01",
      },
      {
        id: "prog-2",
        scenarioId: "scenario-2",
        status: "completed",
        totalTaskCount: 3,
        createdAt: "2024-01-01",
      },
    ]);
    mockRepos.task.findByProgram.mockResolvedValue([]);
    mockRepos.evaluation.findByProgram.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/pbl/history?scenarioId=scenario-1",
    );
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].scenarioId).toBe("scenario-1");
  });

  it("should handle user not found", async () => {
    mockRepos.user.findByEmail.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/pbl/history");
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.error).toBe("User not found");
  });

  it("should handle invalid user cookie", async () => {
    const request = new NextRequest("http://localhost:3000/api/pbl/history");
    request.cookies.get = jest.fn().mockReturnValue({
      value: "invalid-json",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("should calculate scores correctly", async () => {
    mockRepos.user.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });
    mockRepos.program.findByUser.mockResolvedValue([
      {
        id: "prog-1",
        scenarioId: "scenario-1",
        status: "completed",
        totalTaskCount: 2,
        timeSpentSeconds: 1800,
        createdAt: "2024-01-01",
        lastActivityAt: "2024-01-02",
      },
    ]);
    mockRepos.task.findByProgram.mockResolvedValue([
      { id: "task-1", status: "completed", taskIndex: 0, score: 80 },
      { id: "task-2", status: "completed", taskIndex: 1, score: 90 },
    ]);
    mockRepos.evaluation.findByProgram.mockResolvedValue([
      {
        id: "eval-1",
        score: 80,
        domainScores: { domain_1: 75, knowledge: 85 },
      },
      {
        id: "eval-2",
        score: 90,
        domainScores: { domain_1: 95, knowledge: 90 },
      },
    ]);
    mockRepos.content.getScenarioContent.mockRejectedValue(
      new Error("Not found"),
    );

    const request = new NextRequest("http://localhost:3000/api/pbl/history");
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data[0].overallScore).toBe(85);
    expect(data.data[0].domainScores.domain_1).toBe(85);
    expect(data.data[0].ksaScores.knowledge).toBe(87.5);
  });
});
