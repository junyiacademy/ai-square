// Test utilities for API route testing

interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface MockRequest {
  url: string;
  method: string;
  headers: Headers;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

export function createMockRequest(url: string, options: MockRequestOptions = {}): MockRequest {
  const { method = 'GET', headers = {}, body } = options;
  
  return {
    url,
    method,
    headers: new Headers(headers),
    json: async () => {
      if (typeof body === 'string') {
        try {
          return JSON.parse(body);
        } catch {
          throw new SyntaxError('Unexpected end of JSON input');
        }
      }
      return body || {};
    },
    text: async () => {
      if (typeof body === 'string') {
        return body;
      }
      return JSON.stringify(body || {});
    }
  };
}

interface MockResponse {
  json: (data: unknown) => Promise<unknown>;
  status: (code: number) => {
    json: (data: unknown) => Promise<unknown>;
  };
  getStatus: () => number;
  getJson: () => unknown;
}

export function createMockResponse(): MockResponse {
  let status = 200;
  let jsonData: unknown = null;
  
  return {
    json: (data: unknown) => {
      jsonData = data;
      return Promise.resolve(data);
    },
    status: (code: number) => {
      status = code;
      return {
        json: (data: unknown) => {
          jsonData = data;
          return Promise.resolve(data);
        }
      };
    },
    getStatus: () => status,
    getJson: () => jsonData
  };
}