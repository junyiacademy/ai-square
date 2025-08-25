import { POST } from '../route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { SecureSession } from '@/lib/auth/secure-session';
import { AuthManager } from '@/lib/auth/auth-manager';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/secure-session');
jest.mock('@/lib/auth/auth-manager');
jest.mock('bcryptjs');

describe('POST /api/auth/login', () => {
  const mockUserRepo = {
    findByEmail: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (SecureSession.createSession as jest.Mock).mockReturnValue('mock-session-token');
    (AuthManager.setAuthCookie as jest.Mock).mockImplementation(() => {});
  });

  it('should login successfully with valid credentials', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password',
      role: 'student',
      preferredLanguage: 'en',
      emailVerifiedAt: new Date()
    };

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

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
      role: 'student',
      preferredLanguage: 'en',
      emailVerified: true
    });

    expect(SecureSession.createSession).toHaveBeenCalledWith({
      userId: '123',
      email: 'test@example.com',
      role: 'student'
    }, false);

    expect(AuthManager.setAuthCookie).toHaveBeenCalled();
  });

  it('should fail with invalid email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should fail with invalid password', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      passwordHash: 'hashed-password'
    };

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrong-password'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });
});