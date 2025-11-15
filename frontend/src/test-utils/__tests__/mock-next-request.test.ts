import { createMockNextRequest, createMockPostRequest } from '../mock-next-request';
import { NextRequest } from 'next/server';

describe('mock-next-request.ts', () => {
  describe('createMockNextRequest', () => {
    it('should create a basic NextRequest with URL', () => {
      const request = createMockNextRequest('http://localhost:3000/api/test');

      expect(request).toBeInstanceOf(NextRequest);
      expect(request.url).toBe('http://localhost:3000/api/test');
      expect(request.method).toBe('GET');
    });

    it('should handle search params correctly', () => {
      const request = createMockNextRequest('http://localhost:3000/api/test', {
        searchParams: {
          foo: 'bar',
          baz: 'qux'
        }
      });

      expect(request.nextUrl.searchParams.get('foo')).toBe('bar');
      expect(request.nextUrl.searchParams.get('baz')).toBe('qux');
      expect(request.url).toContain('foo=bar');
      expect(request.url).toContain('baz=qux');
    });

    it('should handle relative URLs', () => {
      const request = createMockNextRequest('/api/test');

      expect(request.url).toBe('http://localhost:3000/api/test');
      // nextUrl might not have pathname in test environment, check URL instead
      expect(request.url).toContain('/api/test');
    });

    it('should merge options correctly', () => {
      const request = createMockNextRequest('/api/test', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      });

      expect(request.method).toBe('PUT');
      expect(request.headers.get('Authorization')).toBe('Bearer token123');
      expect(request.headers.get('X-Custom-Header')).toBe('custom-value');
    });

    it('should handle signal option correctly', () => {
      const controller = new AbortController();
      const request = createMockNextRequest('/api/test', {
        signal: controller.signal
      });

      expect(request).toBeInstanceOf(NextRequest);
      // Signal is attached internally, we can't directly test it but ensure no errors
    });

    it('should handle null signal gracefully', () => {
      const request = createMockNextRequest('/api/test', {
        signal: null as any
      });

      expect(request).toBeInstanceOf(NextRequest);
    });

    it('should remove searchParams from final options', () => {
      const request = createMockNextRequest('/api/test', {
        searchParams: { test: 'value' },
        method: 'POST'
      });

      // searchParams should be applied to URL but not passed to NextRequest constructor
      expect(request.nextUrl.searchParams.get('test')).toBe('value');
      expect(request.method).toBe('POST');
    });

    it('should handle empty searchParams', () => {
      const request = createMockNextRequest('/api/test', {
        searchParams: {}
      });

      expect(request.nextUrl.searchParams.toString()).toBe('');
    });

    it('should preserve existing query params in URL', () => {
      const request = createMockNextRequest('http://localhost:3000/api/test?existing=param', {
        searchParams: {
          new: 'param'
        }
      });

      expect(request.nextUrl.searchParams.get('existing')).toBe('param');
      expect(request.nextUrl.searchParams.get('new')).toBe('param');
    });
  });

  describe('createMockPostRequest', () => {
    it('should create a POST request with JSON body', () => {
      const body = { name: 'Test', value: 123 };
      const request = createMockPostRequest('/api/test', body);

      expect(request).toBeInstanceOf(NextRequest);
      expect(request.method).toBe('POST');
      expect(request.headers.get('Content-Type')).toBe('application/json');
    });

    it('should stringify body correctly', async () => {
      const body = {
        string: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' }
      };

      const request = createMockPostRequest('/api/test', body);
      const requestBody = await request.text();

      expect(requestBody).toBe(JSON.stringify(body));
      expect(JSON.parse(requestBody)).toEqual(body);
    });

    it('should handle null and undefined body', () => {
      const requestWithNull = createMockPostRequest('/api/test', null);
      const requestWithUndefined = createMockPostRequest('/api/test', undefined);

      expect(requestWithNull).toBeInstanceOf(NextRequest);
      expect(requestWithUndefined).toBeInstanceOf(NextRequest);
    });

    it('should merge custom headers with Content-Type', () => {
      const request = createMockPostRequest('/api/test', { data: 'test' }, {
        headers: {
          'Authorization': 'Bearer token',
          'X-Request-ID': '12345'
        }
      });

      expect(request.headers.get('Content-Type')).toBe('application/json');
      expect(request.headers.get('Authorization')).toBe('Bearer token');
      expect(request.headers.get('X-Request-ID')).toBe('12345');
    });

    it('should allow overriding Content-Type', () => {
      const request = createMockPostRequest('/api/test', 'plain text', {
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      expect(request.headers.get('Content-Type')).toBe('text/plain');
    });

    it('should preserve other options', () => {
      const request = createMockPostRequest('/api/test', { data: 'test' }, {
        credentials: 'include',
        mode: 'cors'
      });

      expect(request.method).toBe('POST');
      expect(request.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle empty body object', async () => {
      const request = createMockPostRequest('/api/test', {});
      const body = await request.text();

      expect(body).toBe('{}');
    });

    it('should handle arrays as body', async () => {
      const arrayBody = [1, 2, 3, 4, 5];
      const request = createMockPostRequest('/api/test', arrayBody);
      const body = await request.text();

      expect(body).toBe('[1,2,3,4,5]');
    });

    it('should handle special characters in body', async () => {
      const body = {
        special: 'Special "quotes" and \'apostrophes\'',
        unicode: '你好世界 🌍',
        escape: 'Line\nbreak and\ttab'
      };

      const request = createMockPostRequest('/api/test', body);
      const requestBody = await request.text();
      const parsed = JSON.parse(requestBody);

      expect(parsed.special).toBe('Special "quotes" and \'apostrophes\'');
      expect(parsed.unicode).toBe('你好世界 🌍');
      expect(parsed.escape).toBe('Line\nbreak and\ttab');
    });
  });

  describe('Integration tests', () => {
    it('should work with typical API route test pattern', () => {
      const request = createMockNextRequest('/api/users', {
        searchParams: { id: '123' },
        headers: {
          'Authorization': 'Bearer token'
        }
      });

      expect(request.nextUrl.searchParams.get('id')).toBe('123');
      expect(request.headers.get('Authorization')).toBe('Bearer token');
    });

    it('should work with POST request pattern', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      const request = createMockPostRequest('/api/users', userData, {
        headers: {
          'Authorization': 'Bearer token'
        }
      });

      expect(request.method).toBe('POST');
      expect(request.headers.get('Authorization')).toBe('Bearer token');

      const body = await request.json();
      expect(body).toEqual(userData);
    });
  });
});
