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
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.headers || {})
      }
    });
  }
}

module.exports = {
  NextRequest,
  NextResponse
};