import { createMockRepository, createMockEvaluation } from "../repositories";

describe("repository mocks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createMockRepository", () => {
    it("should create a base mock repository", () => {
      const repo = createMockRepository();
      expect(repo.findById).toBeDefined();
      expect(repo.findAll).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
    });
  });

  describe("createMockEvaluation", () => {
    it("should create a mock evaluation", () => {
      const evaluation = createMockEvaluation();
      expect(evaluation).toBeDefined();
      expect(evaluation.id).toBeDefined();
    });
  });
});
