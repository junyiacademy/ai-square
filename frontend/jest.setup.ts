import '@testing-library/jest-dom'
import 'jest-extended'
import { TextEncoder, TextDecoder } from 'util'

// Add missing globals for Node.js test environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

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