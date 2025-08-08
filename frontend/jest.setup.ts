// Import complete test environment setup
import './src/test-utils/setup-test-env'

// Mock Response and Request for Node.js environment
if (!global.Response) {
  global.Response = class Response {
    constructor(public body: any, public init: any = {}) {
      this.status = init.status || 200
      this.statusText = init.statusText || ''
      this.headers = new Map(Object.entries(init.headers || {}))
    }
    
    status: number
    statusText: string
    headers: Map<string, string>
    ok = true
    redirected = false
    type = 'basic' as ResponseType
    url = ''
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
    
    clone() {
      return new Response(this.body, this.init)
    }
  } as any
}

if (!global.Request) {
  global.Request = class Request {
    private _url: string
    private _init: any
    
    constructor(url: string, init: any = {}) {
      this._url = url
      this._init = init
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body
    }
    
    get url() {
      return this._url
    }
    
    method: string
    headers: Map<string, string>
    body: any
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
    
    clone() {
      return new Request(this._url, this._init)
    }
  } as any
}

// Mock Headers
if (!global.Headers) {
  global.Headers = Map as any
}

// Mock i18n module
jest.mock('./src/i18n', () => ({
  default: {
    use: jest.fn().mockReturnThis(),
    init: jest.fn().mockReturnThis(),
    changeLanguage: jest.fn(() => Promise.resolve()),
    language: 'en',
    languages: ['en', 'zhTW', 'zhCN'],
  }
}))

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(() => Promise.resolve()),
      language: 'en',
      languages: ['en', 'zhTW', 'zhCN'],
    },
    ready: true,
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
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
  usePathname: () => '/test-path',
  useParams: () => ({}),
}))

// Mock AuthContext - but allow tests to override
jest.mock('./src/contexts/AuthContext', () => {
  const actual = jest.requireActual('./src/contexts/AuthContext');
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
})

// Mock pg module
jest.mock('pg')

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
}))

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    headers: new Map(),
  })
) as jest.Mock