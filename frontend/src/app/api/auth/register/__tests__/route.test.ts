/**
 * Auth Register API Route Tests
 * 測試用戶註冊功能
 */

import { POST, OPTIONS } from '../route';
import { NextRequest } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Mock Google Cloud Storage
const mockSave = jest.fn();
const mockFile = jest.fn(() => ({ save: mockSave }));
const mockBucket = jest.fn(() => ({ file: mockFile }));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => ({
    bucket: mockBucket,
  })),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('POST - User Registration', () => {
    it('should register a new user successfully', async () => {
      const requestData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Registration successful');
      expect(data.user).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        hasCompletedAssessment: false,
        hasCompletedOnboarding: false,
      });
      expect(data.user.password).toBeUndefined(); // Password should not be returned
      expect(data.user.id).toBeDefined();
    });

    it('should save user data to GCS on successful registration', async () => {
      // Reset mocks for this test
      mockSave.mockClear();
      mockFile.mockClear();
      mockBucket.mockClear();

      const requestData = {
        email: 'gcstest@example.com',
        password: 'password123',
        name: 'GCS Test User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify GCS save was called
      // Verify GCS methods were called in sequence
      expect(mockBucket).toHaveBeenCalled();
      expect(mockFile).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      
      // Check the save was called with JSON data
      const saveCall = mockSave.mock.calls[0];
      expect(saveCall[0]).toContain('gcstest@example.com');
      expect(saveCall[1]).toMatchObject({
        metadata: { contentType: 'application/json' },
      });
    });

    it('should continue registration even if GCS save fails', async () => {
      // Configure mock to reject
      mockSave.mockRejectedValueOnce(new Error('GCS error'));

      const requestData = {
        email: 'gcsfail@example.com',
        password: 'password123',
        name: 'GCS Fail User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Error saving user to GCS:',
        expect.any(Error)
      );
    });

    it('should reject registration with missing fields', async () => {
      const testCases = [
        { email: 'test@example.com', password: 'password123' }, // Missing name
        { email: 'test@example.com', name: 'Test User' }, // Missing password
        { password: 'password123', name: 'Test User' }, // Missing email
      ];

      for (const requestData of testCases) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('All fields are required');
      }
    });

    it('should reject registration with invalid email format', async () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@example.com',
        'user@',
        'user name@example.com',
        'user@example',
      ];

      for (const email of invalidEmails) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password: 'password123',
            name: 'Test User',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid email format');
      }
    });

    it('should reject registration with short password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Password must be at least 8 characters');
    });

    it('should reject registration with existing email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student@example.com', // Existing user from mock DB
          password: 'password123',
          name: 'Duplicate User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email already registered');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should assign correct default values to new users', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'defaults@example.com',
          password: 'password123',
          name: 'Default User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toMatchObject({
        role: 'student',
        hasCompletedAssessment: false,
        hasCompletedOnboarding: false,
        registrationSource: 'web',
        preferences: {
          language: 'en',
          theme: 'light',
        },
      });
      expect(data.user.createdAt).toBeDefined();
      expect(data.user.lastLogin).toBeDefined();
    });
  });

  describe('OPTIONS - CORS Support', () => {
    it('should return correct CORS headers', async () => {
      const response = await OPTIONS();

      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      // Check headers if they exist
      if (response.headers) {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      }
    });
  });
});

/**
 * Edge Cases and Security Considerations:
 * 
 * 1. Password Storage:
 *    - Currently storing plain text passwords (mock DB)
 *    - Production should use bcrypt or similar hashing
 * 
 * 2. Email Sanitization:
 *    - Email is sanitized for GCS file path
 *    - @ becomes _at_, dots become underscores
 * 
 * 3. ID Generation:
 *    - Using simple incrementing IDs
 *    - Production should use UUIDs
 * 
 * 4. Rate Limiting:
 *    - No rate limiting implemented
 *    - Production should limit registration attempts
 * 
 * 5. Email Verification:
 *    - No email verification implemented
 *    - Production should verify email ownership
 */