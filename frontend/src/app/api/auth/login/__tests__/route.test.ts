import { POST } from '../route';
import { NextRequest } from 'next/server';
import { loginUser, autoLoginDev } from '@/lib/auth/simple-auth';

// Mock dependencies
jest.mock('@/lib/auth/simple-auth');

describe('POST /api/auth/login', () => {
  const mockLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;
  const mockAutoLoginDev = autoLoginDev as jest.MockedFunction<typeof autoLoginDev>;

  beforeEach(() => {
    jest.clearAllMocks();
    (process.env as any).NODE_ENV = 'test';
  });

  it('should login successfully with valid credentials', async () => {
    const mockResult = {
      success: true,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'student'
      },
      token: 'mock-session-token'
    };

    mockLoginUser.mockResolvedValue(mockResult);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toEqual({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student'
    });
    expect(mockLoginUser).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('should fail with invalid email', async () => {
    const mockResult = {
      success: false,
      error: 'Invalid credentials'
    };

    mockLoginUser.mockResolvedValue(mockResult);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid credentials');
  });

  it('should fail with invalid password', async () => {
    const mockResult = {
      success: false,
      error: 'Invalid credentials'
    };

    mockLoginUser.mockResolvedValue(mockResult);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid credentials');
  });

  it('should require both email and password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com'
        // missing password
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Email and password are required');
  });

  it('should handle auto-login in development mode', async () => {
    (process.env as any).NODE_ENV = 'development';

    const mockAutoResult = {
      success: true,
      user: {
        id: 'dev-user-123',
        email: 'student@example.com',
        name: 'Dev User',
        role: 'student'
      },
      token: 'dev-session-token'
    };

    mockAutoLoginDev.mockResolvedValue(mockAutoResult);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}) // empty body triggers auto-login
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toEqual({
      id: 'dev-user-123',
      email: 'student@example.com',
      name: 'Dev User',
      role: 'student'
    });
    expect(mockAutoLoginDev).toHaveBeenCalled();
  });

  it('should handle login errors gracefully', async () => {
    mockLoginUser.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('An error occurred during login');
  });
});
