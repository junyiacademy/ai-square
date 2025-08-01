/**
 * Users Update Progress API Route Tests
 * 測試用戶進度更新 API
 */

// Mock Google Cloud Storage
const mockSave = jest.fn();
const mockDownload = jest.fn();
const mockExists = jest.fn();
const mockFile = jest.fn();

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockImplementation(() => ({ 
      file: jest.fn().mockImplementation((path: string) => {
        mockFile(path);
        return {
          save: mockSave,
          download: mockDownload,
          exists: mockExists,
        };
      })
    })),
  })),
}));

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Mock console
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/users/update-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExists.mockResolvedValue([false]);
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('POST - Update User Progress', () => {
    it('should update welcome stage progress', async () => {
      const requestData = {
        email: 'test@example.com',
        stage: 'welcome',
      };

      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('welcome progress updated successfully');
      expect(data.userData.onboarding.welcomeCompleted).toBe(true);
      expect(data.userData.onboarding.welcomeCompletedAt).toBeDefined();

      // Verify GCS save was called
      expect(mockSave).toHaveBeenCalledWith(
        expect.stringContaining('"welcomeCompleted": true'),
        expect.objectContaining({
          metadata: { contentType: 'application/json' },
        })
      );
    });

    it('should update identity stage progress with data', async () => {
      const requestData = {
        email: 'test@example.com',
        stage: 'identity',
        data: {
          identity: 'student',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userData.onboarding.identityCompleted).toBe(true);
      expect(data.userData.identity).toBe('student');
    });

    it('should update goals stage and mark onboarding complete', async () => {
      const requestData = {
        email: 'test@example.com',
        stage: 'goals',
        data: {
          interests: ['AI', 'Machine Learning'],
          goals: ['Learn AI basics', 'Build AI projects'],
        },
      };

      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userData.onboarding.goalsCompleted).toBe(true);
      expect(data.userData.onboarding.completedAt).toBeDefined();
      expect(data.userData.interests).toEqual(['AI', 'Machine Learning']);
      expect(data.userData.learningGoals).toEqual(['Learn AI basics', 'Build AI projects']);
    });

    it('should update assessment stage with results', async () => {
      const requestData = {
        email: 'test@example.com',
        stage: 'assessment',
        data: {
          result: {
            overallScore: 85,
            domainScores: {
              engaging_with_ai: 90,
              creating_with_ai: 80,
              managing_ai: 85,
              designing_ai: 85,
            },
            level: 'intermediate',
          },
        },
      };

      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userData.assessmentCompleted).toBe(true);
      expect(data.userData.assessmentCompletedAt).toBeDefined();
      expect(data.userData.assessmentResult.overallScore).toBe(85);
    });

    it('should load and merge existing user data', async () => {
      const existingData = {
        email: 'test@example.com',
        name: 'Test User',
        onboarding: {
          welcomeCompleted: true,
          identityCompleted: false,
          goalsCompleted: false,
          completedAt: null,
        },
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([Buffer.from(JSON.stringify(existingData))]);

      const requestData = {
        email: 'test@example.com',
        stage: 'identity',
        data: { identity: 'teacher' },
      };

      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userData.name).toBe('Test User'); // Preserved
      expect(data.userData.onboarding.welcomeCompleted).toBe(true); // Preserved
      expect(data.userData.onboarding.identityCompleted).toBe(true); // Updated
      expect(data.userData.identity).toBe('teacher');
    });

    it('should handle missing email or stage', async () => {
      const testCases = [
        { email: 'test@example.com' }, // Missing stage
        { stage: 'welcome' }, // Missing email
        {}, // Missing both
      ];

      for (const requestData of testCases) {
        const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Email and stage are required');
      }
    });

    it('should reject invalid stage', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          stage: 'invalid-stage',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid stage');
    });

    it('should handle GCS errors when loading data', async () => {
      mockExists.mockResolvedValue([true]);
      mockDownload.mockRejectedValue(new Error('GCS read error'));

      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          stage: 'welcome',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should continue with empty user data
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConsoleError).toHaveBeenCalledWith('Error loading user data:', expect.any(Error));
    });

    it('should handle GCS save errors', async () => {
      mockSave.mockRejectedValue(new Error('GCS write error'));

      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          stage: 'welcome',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update progress');
      expect(mockConsoleError).toHaveBeenCalledWith('Error updating user progress:', expect.any(Error));
    });

    it('should sanitize email for file path', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user.name@example.com',
          stage: 'welcome',
        }),
      });

      await POST(request);

      expect(mockFile).toHaveBeenCalledWith('user/user_name_at_example_com/user_data.json');
    });

    it('should update lastModified timestamp', async () => {
      // Ensure clean state
      mockExists.mockResolvedValue([false]);
      mockSave.mockResolvedValue(undefined);
      
      const request = new NextRequest('http://localhost:3000/api/users/update-progress', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          stage: 'welcome',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status !== 200) {
        console.log('Response data:', data);
      }
      expect(response.status).toBe(200);
      expect(data.userData?.lastModified).toBeDefined();
      expect(new Date(data.userData.lastModified).getTime()).toBeCloseTo(Date.now(), -2);
    });
  });
});

/**
 * Update Progress API Considerations:
 * 
 * 1. Stage Validation:
 *    - Only accept valid stages: welcome, identity, goals, assessment
 *    - Each stage has specific data requirements
 * 
 * 2. Data Persistence:
 *    - Uses Google Cloud Storage
 *    - Email sanitization for file paths
 *    - Preserves existing data when updating
 * 
 * 3. Onboarding Flow:
 *    - Welcome -> Identity -> Goals
 *    - Goals completion marks onboarding complete
 * 
 * 4. Error Handling:
 *    - Continue with empty data if load fails
 *    - Return 500 if save fails
 * 
 * 5. Timestamps:
 *    - Track completion time for each stage
 *    - Update lastModified on every change
 */