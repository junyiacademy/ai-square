// Mock implementation of Next.js server components for Jest

class NextRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers || {});
    this.body = init.body || null;
    
    // Parse body if it's a string
    if (typeof this.body === 'string') {
      this._bodyText = this.body;
    }
    
    // Mock nextUrl with searchParams
    this.nextUrl = {
      searchParams: new URLSearchParams(new URL(url).search)
    };
    
    // Mock cookies with a basic Map-like interface
    this._cookieStore = new Map();
    this.cookies = {
      get: (name) => {
        const value = this._cookieStore.get(name);
        return value ? { value } : undefined;
      },
      set: (name, value) => {
        this._cookieStore.set(name, value);
      },
      has: (name) => this._cookieStore.has(name),
      delete: (name) => this._cookieStore.delete(name)
    };
  }

  async json() {
    if (this._bodyText) {
      try {
        return JSON.parse(this._bodyText);
      } catch (error) {
        throw new SyntaxError('Unexpected end of JSON input');
      }
    }
    return {};
  }

  text() {
    return Promise.resolve(this._bodyText || '');
  }
}

class NextResponse extends Response {
  constructor(body, init = {}) {
    super(body, init);
    // Ensure headers are available
    if (!this.headers) {
      this.headers = new Headers(init.headers || {});
    }
  }
  
  static json(body, init = {}) {
    const response = new NextResponse(JSON.stringify(body), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.headers || {})
      }
    });
    
    // Add json method to the response
    response.json = async () => body;
    
    return response;
  }
}

// Export both as CommonJS and ES6 modules
exports.NextRequest = NextRequest;
exports.NextResponse = NextResponse;
module.exports = {
  NextRequest,
  NextResponse
};