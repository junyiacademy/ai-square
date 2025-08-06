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
    constructor(public url: string, public init: any = {}) {
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body
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
      return new Request(this.url, this.init)
    }
  } as any
}

// Mock Headers
if (!global.Headers) {
  global.Headers = Map as any
}