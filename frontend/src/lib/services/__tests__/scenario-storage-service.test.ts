import {
  getScenarioStorageService,
  type IScenarioStorageService,
} from "../scenario-storage-service";

describe("MockScenarioStorageService", () => {
  let service: IScenarioStorageService;

  beforeEach(() => {
    service = getScenarioStorageService();
  });

  describe("list", () => {
    it("returns list of scenario IDs", async () => {
      const scenarios = await service.list();

      expect(scenarios).toEqual(["ai-job-search", "smart-home-assistant"]);
      expect(scenarios).toHaveLength(2);
    });
  });

  describe("getScenario", () => {
    it("returns scenario data with correct structure", async () => {
      const scenarioId = "test-scenario";
      const scenario = await service.getScenario(scenarioId);

      expect(scenario).toEqual({
        id: scenarioId,
        title: `${scenarioId} Title`,
        description: `Description for ${scenarioId}`,
        difficulty: "intermediate",
        estimated_duration: 60,
        target_domains: ["engaging_with_ai"],
        stages: [],
      });
    });

    it("generates dynamic content based on scenario ID", async () => {
      const scenario1 = await service.getScenario("scenario-1");
      const scenario2 = await service.getScenario("scenario-2");

      expect(scenario1.id).toBe("scenario-1");
      expect(scenario1.title).toBe("scenario-1 Title");

      expect(scenario2.id).toBe("scenario-2");
      expect(scenario2.title).toBe("scenario-2 Title");
    });
  });

  describe("getProgram", () => {
    it("returns program data with correct structure", async () => {
      const scenarioId = "test-scenario";
      const programId = "test-program";
      const program = await service.getProgram(scenarioId, programId);

      expect(program).toEqual({
        id: programId,
        scenarioId,
        status: "active",
        userId: "user123",
      });
    });

    it("includes both scenario and program IDs", async () => {
      const program = await service.getProgram("scenario-123", "program-456");

      expect(program.scenarioId).toBe("scenario-123");
      expect(program.id).toBe("program-456");
    });
  });

  describe("getTask", () => {
    it("returns task data with correct structure", async () => {
      const scenarioId = "test-scenario";
      const programId = "test-program";
      const taskId = "test-task";
      const task = await service.getTask(scenarioId, programId, taskId);

      expect(task).toEqual({
        id: taskId,
        programId,
        status: "pending",
      });
    });

    it("includes task and program IDs", async () => {
      const task = await service.getTask(
        "scenario-123",
        "program-456",
        "task-789",
      );

      expect(task.id).toBe("task-789");
      expect(task.programId).toBe("program-456");
    });
  });

  describe("getEvaluation", () => {
    it("returns evaluation data with correct structure", async () => {
      const scenarioId = "test-scenario";
      const programId = "test-program";
      const evaluationId = "test-eval";
      const evaluation = await service.getEvaluation(
        scenarioId,
        programId,
        evaluationId,
      );

      expect(evaluation).toEqual({
        id: evaluationId,
        programId,
        score: 85,
      });
    });

    it("includes evaluation and program IDs", async () => {
      const evaluation = await service.getEvaluation(
        "scenario-123",
        "program-456",
        "eval-789",
      );

      expect(evaluation.id).toBe("eval-789");
      expect(evaluation.programId).toBe("program-456");
    });
  });

  describe("interface compliance", () => {
    it("implements IScenarioStorageService interface", () => {
      expect(service.list).toBeDefined();
      expect(service.getScenario).toBeDefined();
      expect(service.getProgram).toBeDefined();
      expect(service.getTask).toBeDefined();
      expect(service.getEvaluation).toBeDefined();
    });

    it("all methods return promises", async () => {
      expect(service.list()).toBeInstanceOf(Promise);
      expect(service.getScenario("id")).toBeInstanceOf(Promise);
      expect(service.getProgram("sid", "pid")).toBeInstanceOf(Promise);
      expect(service.getTask("sid", "pid", "tid")).toBeInstanceOf(Promise);
      expect(service.getEvaluation("sid", "pid", "eid")).toBeInstanceOf(
        Promise,
      );
    });
  });
});

// Test the interface definition
describe("IScenarioStorageService interface", () => {
  it("should be implemented correctly by factory function", () => {
    const service: IScenarioStorageService = getScenarioStorageService();
    expect(service).toBeDefined();
  });
});
