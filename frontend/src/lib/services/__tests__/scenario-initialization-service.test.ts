import type { IScenario } from "@/types/unified-learning";

// Prepare repo mock and loader mocks as module-level vars
const mockScenarioRepo = {
  findByMode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

let pblYAMLLoader: { scanScenarios: jest.Mock; loadScenario: jest.Mock };
let discoveryYAMLLoader: { scanPaths: jest.Mock; loadPath: jest.Mock };
let assessmentYAMLLoader: {
  scanAssessments: jest.Mock;
  loadAssessment: jest.Mock;
  getAvailableLanguages: jest.Mock;
  getTranslatedField: jest.Mock;
};

function loadService() {
  jest.resetModules();

  // repository factory mock
  jest.doMock("@/lib/repositories/base/repository-factory", () => ({
    repositoryFactory: {
      getScenarioRepository: jest.fn(() => mockScenarioRepo),
    },
  }));

  // loaders mock
  jest.doMock("../pbl-yaml-loader", () => ({
    pblYAMLLoader: {
      scanScenarios: jest.fn(),
      loadScenario: jest.fn(),
    },
  }));
  jest.doMock("../discovery-yaml-loader", () => ({
    discoveryYAMLLoader: {
      scanPaths: jest.fn(),
      loadPath: jest.fn(),
    },
  }));
  jest.doMock("../assessment-yaml-loader", () => ({
    assessmentYAMLLoader: {
      scanAssessments: jest.fn(),
      loadAssessment: jest.fn(),
      getAvailableLanguages: jest.fn(),
      getTranslatedField: jest.fn(
        (cfg: Record<string, unknown>, field: string, lang: string) => {
          const key = lang === "en" ? field : `${field}_${lang}`;
          return (cfg[key] as string) || (cfg[field] as string) || "";
        },
      ),
    },
  }));

  // Load module under isolated environment
  let ServiceCtor: any;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const p = require("../pbl-yaml-loader");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const d = require("../discovery-yaml-loader");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const a = require("../assessment-yaml-loader");
    pblYAMLLoader = p.pblYAMLLoader;
    discoveryYAMLLoader = d.discoveryYAMLLoader;
    assessmentYAMLLoader = a.assessmentYAMLLoader;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ServiceCtor =
      require("../scenario-initialization-service").ScenarioInitializationService;
  });

  return new ServiceCtor();
}

function existingScenario(overrides: Partial<IScenario> = {}): IScenario {
  return {
    id: "s1",
    mode: "pbl",
    status: "active",
    version: "1.0",
    sourceType: "yaml",
    title: { en: "Title" },
    description: { en: "Desc" },
    objectives: [],
    difficulty: "intermediate",
    estimatedMinutes: 60,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 0,
    xpRewards: {},
    unlockRequirements: {},
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  } as IScenario;
}

describe("ScenarioInitializationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes PBL scenarios (create path)", async () => {
    const service = loadService();

    pblYAMLLoader.scanScenarios.mockResolvedValue(["ai_job_search"]);
    pblYAMLLoader.loadScenario.mockResolvedValue({
      scenario_info: {
        title: "AI Job Search",
        description: "desc",
        difficulty: "intermediate",
        estimated_duration: "45 minutes",
        target_domains: ["engage"],
      },
      programs: [{ id: "p1", tasks: [{ id: "t1", title: "Task" }] }],
    });

    mockScenarioRepo.findByMode.mockResolvedValue([]);
    mockScenarioRepo.create.mockImplementation(
      async (dto: Omit<IScenario, "id">) =>
        existingScenario({ id: "new1", ...dto }),
    );

    const result = await service.initializePBLScenarios();
    expect(pblYAMLLoader.scanScenarios).toHaveBeenCalled();
    expect(mockScenarioRepo.create).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("skips when scenario exists and forceUpdate=false", async () => {
    const service = loadService();

    const yamlPath = "pbl_data/scenarios/ai_job_search/ai_job_search_en.yaml";
    pblYAMLLoader.scanScenarios.mockResolvedValue(["ai_job_search"]);
    pblYAMLLoader.loadScenario.mockResolvedValue({
      scenario_info: { title: "exists", description: "" },
      programs: [],
    });

    mockScenarioRepo.findByMode.mockResolvedValue([
      existingScenario({ sourcePath: yamlPath }),
    ]);

    const result = await service.initializePBLScenarios({ forceUpdate: false });
    expect(result.skipped).toBe(1);
    expect(mockScenarioRepo.create).not.toHaveBeenCalled();
    expect(mockScenarioRepo.update).not.toHaveBeenCalled();
  });

  it("updates when scenario exists and forceUpdate=true", async () => {
    const service = loadService();

    const yamlPath = "pbl_data/scenarios/ai_job_search/ai_job_search_en.yaml";
    pblYAMLLoader.scanScenarios.mockResolvedValue(["ai_job_search"]);
    pblYAMLLoader.loadScenario.mockResolvedValue({
      scenario_info: { title: "exists", description: "" },
      programs: [],
    });

    const existing = existingScenario({ id: "s1", sourcePath: yamlPath });
    mockScenarioRepo.findByMode.mockResolvedValue([existing]);
    mockScenarioRepo.update.mockResolvedValue(existing);

    const result = await service.initializePBLScenarios({ forceUpdate: true });
    expect(mockScenarioRepo.update).toHaveBeenCalledTimes(1);
    expect(result.updated).toBe(1);
  });

  it("dryRun should not write, but count created", async () => {
    const service = loadService();

    pblYAMLLoader.scanScenarios.mockResolvedValue(["ai_job_search"]);
    pblYAMLLoader.loadScenario.mockResolvedValue({
      scenario_info: { title: "A", description: "" },
      programs: [],
    });
    mockScenarioRepo.findByMode.mockResolvedValue([]);

    const result = await service.initializePBLScenarios({ dryRun: true });
    expect(result.created).toBe(1);
    expect(mockScenarioRepo.create).not.toHaveBeenCalled();
  });

  it("initializes Discovery scenarios via scanPaths/loadPath", async () => {
    const service = loadService();

    discoveryYAMLLoader.scanPaths.mockResolvedValue(["app_developer"]);
    discoveryYAMLLoader.loadPath.mockResolvedValue({
      metadata: {
        title: "App Dev",
        long_description: "ldesc",
        estimated_hours: 2,
        skill_focus: ["js"],
      },
      category: "tech",
      difficulty_range: "beginner-advanced",
      world_setting: {},
      skill_tree: { core_skills: [], advanced_skills: [] },
      milestone_quests: [],
    });
    // simulate another language path also present in scanPaths list leading to two create calls unless forceUpdate/exists
    mockScenarioRepo.findByMode.mockResolvedValue([]);
    mockScenarioRepo.create.mockClear();
    mockScenarioRepo.findByMode.mockResolvedValue([]);
    mockScenarioRepo.create.mockImplementation(
      async (dto: Omit<IScenario, "id">) =>
        existingScenario({ id: "d1", ...dto }),
    );

    const result = await service.initializeDiscoveryScenarios();
    expect(discoveryYAMLLoader.scanPaths).toHaveBeenCalled();
    expect(mockScenarioRepo.create).toHaveBeenCalledTimes(2);
    expect(result.created).toBe(2);
  });

  it("initializes Assessment scenarios combining languages", async () => {
    const service = loadService();

    assessmentYAMLLoader.scanAssessments.mockResolvedValue(["ai_literacy"]);
    assessmentYAMLLoader.getAvailableLanguages.mockResolvedValue([
      "en",
      "zhTW",
    ]);

    assessmentYAMLLoader.loadAssessment
      .mockResolvedValueOnce({
        config: {
          title: "AI Literacy Test",
          description: "desc",
          total_questions: 20,
          time_limit_minutes: 30,
          passing_score: 75,
          domains: [],
        },
        questions: [
          { id: "q1", question: "Q1", options: ["a"], correct_answer: "a" },
        ],
      })
      .mockResolvedValueOnce({
        config: { title_zhTW: "AI 素養測驗", description_zhTW: "描述" },
        questions: [
          {
            id: "q1",
            question_zhTW: "Q1-中",
            options: ["a"],
            correct_answer: "a",
          },
        ],
      });

    mockScenarioRepo.findByMode.mockResolvedValue([]);
    mockScenarioRepo.create.mockImplementation(
      async (dto: Omit<IScenario, "id">) =>
        existingScenario({ id: "a1", ...dto }),
    );

    const result = await service.initializeAssessmentScenarios();
    expect(assessmentYAMLLoader.scanAssessments).toHaveBeenCalled();
    expect(assessmentYAMLLoader.getAvailableLanguages).toHaveBeenCalledWith(
      "ai_literacy",
    );
    expect(mockScenarioRepo.create).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(1);
  });

  it("collects errors when processor fails for a file", async () => {
    const service = loadService();

    pblYAMLLoader.scanScenarios.mockResolvedValue(["bad"]);
    pblYAMLLoader.loadScenario.mockRejectedValue(new Error("bad yaml"));
    mockScenarioRepo.findByMode.mockResolvedValue([]);

    const result = await service.initializePBLScenarios();
    expect(result.errors.length).toBe(1);
    expect(result.created + result.updated + result.skipped).toBe(0);
  });
});
