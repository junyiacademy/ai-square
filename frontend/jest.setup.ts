// Import complete test environment setup
import "./src/test-utils/setup-test-env";

// Mock Response and Request for Node.js environment
if (!global.Response) {
  global.Response = class Response {
    constructor(
      public body: any,
      public init: any = {},
    ) {
      this.status = init.status || 200;
      this.statusText = init.statusText || "";
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    status: number;
    statusText: string;
    headers: Map<string, string>;
    ok = true;
    redirected = false;
    type = "basic" as ResponseType;
    url = "";

    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === "string"
        ? this.body
        : JSON.stringify(this.body);
    }

    clone() {
      return new Response(this.body, this.init);
    }
  } as any;
}

if (!global.Request) {
  global.Request = class Request {
    private _url: string;
    private _init: any;

    constructor(url: string, init: any = {}) {
      this._url = url;
      this._init = init;
      this.method = init.method || "GET";
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
    }

    get url() {
      return this._url;
    }

    method: string;
    headers: Map<string, string>;
    body: any;

    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === "string"
        ? this.body
        : JSON.stringify(this.body);
    }

    clone() {
      return new Request(this._url, this._init);
    }
  } as any;
}

// Mock Headers
if (!global.Headers) {
  global.Headers = Map as any;
}

// Mock i18n module
jest.mock("./src/i18n", () => ({
  default: {
    use: jest.fn().mockReturnThis(),
    init: jest.fn().mockReturnThis(),
    changeLanguage: jest.fn(() => Promise.resolve()),
    language: "en",
    languages: ["en", "zhTW", "zhCN"],
  },
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(() => Promise.resolve()),
      language: "en",
      languages: ["en", "zhTW", "zhCN"],
    },
    ready: true,
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => "/test-path",
  useParams: () => ({}),
}));

// Mock AuthContext - but allow tests to override
jest.mock("./src/contexts/AuthContext", () => {
  const actual = jest.requireActual("./src/contexts/AuthContext");
  return {
    ...actual,
    // Only provide default mock for useAuth if not in AuthContext test
    useAuth: jest.fn(() => ({
      user: null,
      isLoading: false,
      isLoggedIn: false,
      tokenExpiringSoon: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
      refreshToken: jest.fn(),
    })),
  };
});

// Mock pg module with comprehensive implementation
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockImplementation(async (text, params) => {
      // Mock different query types
      if (text.includes("SELECT 1")) {
        return { rows: [{ test: 1 }], rowCount: 1 };
      }
      if (text.includes("information_schema.tables")) {
        const tableName = params?.[0];
        const exists = [
          "users",
          "scenarios",
          "programs",
          "tasks",
          "evaluations",
        ].includes(tableName);
        return { rows: [{ exists: exists }], rowCount: 1 };
      }
      if (text.includes("INSERT INTO")) {
        return { rows: [{ id: `mock-${Date.now()}` }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
  verify: jest.fn().mockReturnValue({ userId: "test-user-id" }),
}));

// Mock uuid with a valid UUID format
let uuidCounter = 0;
jest.mock("uuid", () => ({
  v4: jest.fn(() => {
    // Generate a valid UUID v4 format for testing
    uuidCounter++;
    const hex = uuidCounter.toString(16).padStart(8, "0");
    return `00000000-0000-4000-8000-${hex}00000000`.substr(0, 36);
  }),
}));

// Mock Redis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue("PONG"),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    flushdb: jest.fn().mockResolvedValue("OK"),
    quit: jest.fn().mockResolvedValue("OK"),
  }));
});

// Mock repository factory
jest.mock("./src/lib/repositories/base/repository-factory", () => ({
  repositoryFactory: {
    // Repository getter methods
    getUserRepository: jest.fn().mockReturnValue({
      findById: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      findByEmail: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      create: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getScenarioRepository: jest.fn().mockReturnValue({
      findById: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      findByMode: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      update: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      findActive: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getProgramRepository: jest.fn().mockReturnValue({
      findById: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByScenarioId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      update: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getTaskRepository: jest.fn().mockReturnValue({
      findById: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      findByProgramId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      update: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getEvaluationRepository: jest.fn().mockReturnValue({
      findById: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      findByTaskId: jest.fn().mockResolvedValue([]),
      findByUserId: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
  },
  createRepositoryFactory: jest.fn().mockReturnValue({
    users: {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      findByEmail: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      create: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    scenarios: {
      findById: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      findByMode: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      update: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    programs: {
      findById: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByScenarioId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      update: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    tasks: {
      findById: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      findByProgramId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      update: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    evaluations: {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      findByTaskId: jest.fn().mockResolvedValue([]),
      findByUserId: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    getDiscoveryRepository: jest.fn().mockReturnValue({
      findById: jest
        .fn()
        .mockResolvedValue({ id: "discovery-1", pathId: "path-1" }),
      create: jest
        .fn()
        .mockResolvedValue({ id: "discovery-1", pathId: "path-1" }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "discovery-1", pathId: "path-1" }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getContentRepository: jest.fn().mockReturnValue({
      read: jest.fn().mockResolvedValue("test content"),
      write: jest.fn().mockResolvedValue(true),
      exists: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue([]),
      getMetadata: jest.fn().mockResolvedValue({ size: 100 }),
      getScenarioContent: jest.fn().mockResolvedValue({
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
      }),
    }),
    getMediaRepository: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue("test-url"),
      delete: jest.fn().mockResolvedValue(true),
      exists: jest.fn().mockResolvedValue(true),
      getMetadata: jest.fn().mockResolvedValue({ size: 100 }),
      list: jest.fn().mockResolvedValue([]),
    }),
  }),
  RepositoryFactory: jest.fn().mockImplementation(() => ({
    // Getter methods for repository access
    getUserRepository: jest.fn().mockReturnValue({
      findById: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      findByEmail: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      create: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getScenarioRepository: jest.fn().mockReturnValue({
      findById: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      findByMode: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      update: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      findActive: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getProgramRepository: jest.fn().mockReturnValue({
      findById: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByScenarioId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      update: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getTaskRepository: jest.fn().mockReturnValue({
      findById: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      findByProgramId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      update: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    getEvaluationRepository: jest.fn().mockReturnValue({
      findById: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      findByTaskId: jest.fn().mockResolvedValue([]),
      findByUserId: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }),
    users: {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      findByEmail: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      create: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    scenarios: {
      findById: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      findByMode: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      update: jest.fn().mockResolvedValue({
        id: "scenario-1",
        mode: "pbl",
        title: { en: "Test" },
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    programs: {
      findById: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByScenarioId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      update: jest.fn().mockResolvedValue({
        id: "program-1",
        scenarioId: "scenario-1",
        userId: "user-1",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    tasks: {
      findById: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      findByProgramId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      update: jest.fn().mockResolvedValue({
        id: "task-1",
        programId: "program-1",
        type: "question",
      }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    evaluations: {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      findByTaskId: jest.fn().mockResolvedValue([]),
      findByUserId: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      update: jest
        .fn()
        .mockResolvedValue({ id: "eval-1", taskId: "task-1", score: 85 }),
      delete: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  })),
}));

// Mock Google Cloud Vertex AI
jest.mock("@google-cloud/vertexai", () => {
  const mockGenerateContent = jest.fn().mockResolvedValue({
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: "Mocked AI response",
              },
            ],
          },
        },
      ],
    },
  });

  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      preview: {
        getGenerativeModel: mockGetGenerativeModel,
      },
    })),
  };
});

// Mock authentication session
jest.mock("./src/lib/auth/session", () => ({
  getSession: jest.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
    },
    expires: "2030-01-01T00:00:00.000Z",
  }),
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
    },
    expires: "2030-01-01T00:00:00.000Z",
  }),
  generateSessionToken: jest.fn().mockReturnValue("mock-session-token"),
  verifySessionToken: jest.fn().mockResolvedValue({
    userId: "test-user-id",
    valid: true,
  }),
}));

// Mock AuthManager
jest.mock("./src/lib/auth/auth-manager", () => ({
  AuthManager: {
    generateSessionToken: jest.fn().mockReturnValue("mock-session-token-hex"),
    isValidSessionToken: jest.fn().mockImplementation((token: string) => {
      // Mock hex token validation - should be 64 hex characters
      return typeof token === "string" && /^[a-f0-9]{64}$/i.test(token);
    }),
    hashPassword: jest.fn().mockResolvedValue("$2b$10$mock.hashed.password"),
    verifyPassword: jest.fn().mockResolvedValue(true),
    generatePasswordResetToken: jest.fn().mockReturnValue("mock-reset-token"),
    isAuthenticated: jest.fn().mockResolvedValue(true),
  },
}));

// Mock email service
jest.mock("./src/lib/email/email-service", () => ({
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Mock database connection pool
jest.mock("./src/lib/db/get-pool", () => ({
  getPool: jest.fn().mockReturnValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  }),
  closePool: jest.fn().mockResolvedValue(undefined),
}));

// Mock crypto module with unique values - CRITICAL: Fix ES module import mocking
let cryptoCounter = 0;

// CRITICAL: Properly mock crypto for both CommonJS and ES module imports
const mockCrypto = {
  randomBytes: jest.fn().mockImplementation((length: number) => ({
    toString: jest.fn().mockImplementation((encoding: string) => {
      if (encoding === "hex") {
        // Generate a unique hex string of the correct length
        cryptoCounter++;
        const baseHex = cryptoCounter.toString(16).padStart(8, "0");
        const fullHex = (
          baseHex + "0".repeat(Math.max(0, length * 2 - baseHex.length))
        ).slice(0, length * 2);
        return fullHex;
      }
      return "mock-random-string";
    }),
  })),
  randomUUID: jest.fn().mockReturnValue("mock-uuid"),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mock-hash-digest-1234567890abcdef"),
  }),
};

jest.mock("crypto", () => ({
  __esModule: true,
  default: mockCrypto, // For ES module: import crypto from 'crypto'
  ...mockCrypto, // For named imports: import { createHash } from 'crypto'
}));

// Also create a global crypto mock for Node.js compatibility
Object.defineProperty(global, "crypto", {
  value: mockCrypto,
  writable: true,
});

// Mock file system operations
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue("mock file content"),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue("mock file content"),
}));

// Mock Google Cloud Storage
jest.mock("@google-cloud/storage", () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        exists: jest.fn().mockResolvedValue([true]),
        download: jest.fn().mockResolvedValue([Buffer.from("test content")]),
        save: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        getMetadata: jest.fn().mockResolvedValue([{ size: 100 }]),
      }),
      getFiles: jest.fn().mockResolvedValue([
        [
          /* empty array for files */
        ],
      ]),
    }),
  })),
}));

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => "",
    headers: new Map(),
  }),
) as jest.Mock;
