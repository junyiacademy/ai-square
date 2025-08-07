import { NextRequest, NextResponse } from 'next/server';
import { checkDiscoveryAuth } from '../discovery-auth';
import { getServerSession } from '@/lib/auth/session';

// Mock the session module
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn(),
}));

// Mock NextResponse.redirect
jest.mock('next/server', () => ({
  NextRequest: jest.requireActual('next/server').NextRequest,
  NextResponse: {
    redirect: jest.fn((url) => ({
      status: 307,
      headers: new Map([['location', url.toString()]]),
    })),
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRedirect = NextResponse.redirect as jest.MockedFunction<typeof NextResponse.redirect>;

describe('discovery-auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should continue request when user has valid session', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'user@example.com' }
    };
    mockGetServerSession.mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/discovery');
    
    const result = await checkDiscoveryAuth(request);

    expect(result).toBeNull();
    expect(mockGetServerSession).toHaveBeenCalled();
  });

  it('should redirect to login when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/discovery/career-path');
    
    const result = await checkDiscoveryAuth(request);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(307); // Temporary redirect
    expect(result!.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fdiscovery%2Fcareer-path');
  });

  it('should redirect to login with correct return URL for nested paths', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/discovery/skills/assessment');
    
    const result = await checkDiscoveryAuth(request);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(307);
    expect(result!.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fdiscovery%2Fskills%2Fassessment');
  });

  it('should handle root discovery path', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/discovery');
    
    const result = await checkDiscoveryAuth(request);

    expect(result).not.toBeNull();
    expect(result!.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fdiscovery');
  });

  it('should handle session service errors gracefully', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Session service error'));

    const request = new NextRequest('http://localhost:3000/discovery');
    
    const result = await checkDiscoveryAuth(request);

    // Should treat error as no session and redirect
    expect(result).not.toBeNull();
    expect(result!.status).toBe(307);
    expect(result!.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fdiscovery');
  });
});