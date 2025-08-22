import { NextRequest, NextResponse } from 'next/server';
import { middleware, config } from '../middleware';

// Mock NextResponse methods
jest.mock('next/server', () => ({
  NextRequest: jest.requireActual('next/server').NextRequest,
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url: URL) => ({
      type: 'redirect',
      url: url.toString()
    }))
  }
}));

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('unprotected routes', () => {
    it('should allow access to home page', () => {
      const request = new NextRequest('http://localhost:3000/');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should allow access to login page', () => {
      const request = new NextRequest('http://localhost:3000/login');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should allow access to register page', () => {
      const request = new NextRequest('http://localhost:3000/register');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });
  });

  describe('protected routes', () => {
    describe('without authentication', () => {
      it('should redirect /pbl to login', () => {
        const request = new NextRequest('http://localhost:3000/pbl');
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: 'redirect',
          url: expect.stringContaining('/login')
        });
      });

      it('should redirect /assessment to login', () => {
        const request = new NextRequest('http://localhost:3000/assessment');
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: 'redirect',
          url: expect.stringContaining('/login')
        });
      });

      it('should redirect /discovery to login', () => {
        const request = new NextRequest('http://localhost:3000/discovery');
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: 'redirect',
          url: expect.stringContaining('/login')
        });
      });

      it('should redirect /admin to login', () => {
        const request = new NextRequest('http://localhost:3000/admin');
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: 'redirect',
          url: expect.stringContaining('/login')
        });
      });

      it('should redirect /profile to login', () => {
        const request = new NextRequest('http://localhost:3000/profile');
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: 'redirect',
          url: expect.stringContaining('/login')
        });
      });

      it('should preserve redirect parameter', () => {
        const request = new NextRequest('http://localhost:3000/pbl/scenarios/123');
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
        const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
        expect(redirectCall.toString()).toContain('redirect=%2Fpbl%2Fscenarios%2F123');
      });
    });

    describe('with authentication', () => {
      it('should allow access with valid sessionToken', () => {
        const request = new NextRequest('http://localhost:3000/pbl');
        // Create a valid base64 encoded session token
        const validToken = btoa(JSON.stringify({ userId: '123', email: 'test@example.com' }));
        request.cookies.set('sessionToken', validToken);
        
        const response = middleware(request);
        
        expect(NextResponse.next).toHaveBeenCalled();
        expect(response).toEqual({ type: 'next' });
      });

      it('should redirect if sessionToken is missing', () => {
        const request = new NextRequest('http://localhost:3000/pbl');
        
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
      });

      it('should redirect if sessionToken is invalid', () => {
        const request = new NextRequest('http://localhost:3000/pbl');
        request.cookies.set('sessionToken', 'invalid-token');
        
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
      });

      it('should redirect if sessionToken is empty', () => {
        const request = new NextRequest('http://localhost:3000/pbl');
        request.cookies.set('sessionToken', '');
        
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
      });
    });
  });

  describe('skipped routes', () => {
    it('should skip API routes', () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should skip static files', () => {
      const request = new NextRequest('http://localhost:3000/image.png');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should skip _next internal routes', () => {
      const request = new NextRequest('http://localhost:3000/_next/static/chunk.js');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });
  });
});

describe('middleware config', () => {
  it('should have correct matcher configuration', () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(config.matcher).toContain('/((?!_next/static|_next/image|favicon.ico|public).*)');
  });
});