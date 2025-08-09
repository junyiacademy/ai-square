import { NextRequest, NextResponse } from 'next/server';
import { checkDiscoveryAuth } from '../discovery-auth';
import { getServerSession } from '@/lib/auth/session';

jest.mock('@/lib/auth/session');

// Mock NextResponse.redirect
jest.mock('next/server', () => ({
  NextRequest: jest.requireActual('next/server').NextRequest,
  NextResponse: {
    redirect: jest.fn((url: URL) => {
      const response = new Response(null, {
        status: 302,
        headers: {
          location: url.toString()
        }
      });
      return response;
    })
  }
}));

describe('Discovery Auth Middleware', () => {
  describe('checkDiscoveryAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow authenticated requests', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    
    const request = new NextRequest('http://localhost:3000/discovery');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeNull();
  });

  it('should redirect unauthenticated requests to login', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/discovery/scenarios');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeTruthy();
    expect(response?.headers.get('location')).toContain('/login');
    expect(response?.headers.get('location')).toContain('redirect=%2Fdiscovery%2Fscenarios');
  });

  it('should preserve redirect parameter with full path', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/discovery/scenarios/123/program/456');
    const response = await checkDiscoveryAuth(request);
    
    expect(response?.headers.get('location')).toContain('redirect=%2Fdiscovery%2Fscenarios%2F123%2Fprogram%2F456');
  });

  it('should handle session service errors', async () => {
    (getServerSession as jest.Mock).mockRejectedValue(new Error('Session error'));
    
    const request = new NextRequest('http://localhost:3000/discovery');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeTruthy();
    expect(response?.headers.get('location')).toContain('/login');
  });

  it('should handle different URL formats', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('https://example.com/discovery/path');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeTruthy();
    expect(response?.headers.get('location')).toContain('/login');
    expect(response?.headers.get('location')).toContain('redirect=%2Fdiscovery%2Fpath');
  });

  it('should handle empty session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({});
    
    const request = new NextRequest('http://localhost:3000/discovery');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeNull();
  });

  it('should handle session with minimal user info', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: {} });
    
    const request = new NextRequest('http://localhost:3000/discovery');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeNull();
  });

  it('should handle paths with query parameters', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/discovery/scenarios?filter=active&sort=date');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeTruthy();
    expect(response?.headers.get('location')).toContain('redirect=%2Fdiscovery%2Fscenarios');
  });

  it('should handle paths with hash fragments', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/discovery#section');
    const response = await checkDiscoveryAuth(request);
    
    expect(response).toBeTruthy();
    expect(response?.headers.get('location')).toContain('redirect=%2Fdiscovery');
  });
  });
});