// Test utilities for API route testing

export function createMockRequest(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}) {
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
  } as any;
}

export function createMockResponse() {
  let status = 200;
  let jsonData: any = null;
  
  return {
    json: (data: any) => {
      jsonData = data;
      return Promise.resolve(data);
    },
    status: (code: number) => {
      status = code;
      return {
        json: (data: any) => {
          jsonData = data;
          return Promise.resolve(data);
        }
      };
    },
    getStatus: () => status,
    getJson: () => jsonData
  };
}