import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { TranslationService } from '@/lib/services/translation-service';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');
jest.mock('@/lib/services/translation-service');

const mockGetServerSession = getServerSession as jest.Mock;
const mockGetProgramRepository = jest.fn();
const mockGetEvaluationRepository = jest.fn();

const mockProgramRepo = {
  findById: jest.fn(),
};

const mockEvaluationRepo = {
  findByProgram: jest.fn(),
};

const mockTranslationService = {
  translateFeedback: jest.fn(),
};

(repositoryFactory.getProgramRepository as jest.Mock) = mockGetProgramRepository;
(repositoryFactory.getEvaluationRepository as jest.Mock) = mockGetEvaluationRepository;
(TranslationService as unknown as jest.Mock).mockImplementation(() => mockTranslationService);

describe('/api/discovery/programs/[programId]/translate-feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProgramRepository.mockReturnValue(mockProgramRepo);
    mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);
  });

  describe('POST', () => {
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com'
      }
    };

    const mockProgram = {
      id: 'program123',
      userId: 'test@example.com',
      scenarioId: 'scenario123',
      status: 'completed'
    };

    const mockEvaluation = {
      id: 'eval123',
      programId: 'program123',
      evaluationType: 'discovery_complete',
      metadata: {
        qualitativeFeedback: {
          overallAssessment: 'You have shown great potential',
          careerAlignment: 'Your skills align well with this career',
          strengths: ['Problem solving', 'Communication'],
          growthAreas: ['Technical skills', 'Leadership'],
          nextSteps: ['Take advanced courses', 'Join communities']
        },
        careerType: 'software_engineer',
        qualitativeFeedbackVersions: {}
      }
    };

    it('successfully translates feedback to target language', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue([mockEvaluation]);
      
      // Mock translations
      mockTranslationService.translateFeedback
        .mockResolvedValueOnce('Vous avez montré un grand potentiel')
        .mockResolvedValueOnce('Vos compétences correspondent bien à cette carrière')
        .mockResolvedValueOnce('Résolution de problèmes')
        .mockResolvedValueOnce('Communication')
        .mockResolvedValueOnce('Compétences techniques')
        .mockResolvedValueOnce('Leadership')
        .mockResolvedValueOnce('Suivre des cours avancés')
        .mockResolvedValueOnce('Rejoindre des communautés');

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        translatedFeedback: {
          overallAssessment: 'Vous avez montré un grand potentiel',
          careerAlignment: 'Vos compétences correspondent bien à cette carrière',
          strengths: ['Résolution de problèmes', 'Communication'],
          growthAreas: ['Compétences techniques', 'Leadership'],
          nextSteps: ['Suivre des cours avancés', 'Rejoindre des communautés']
        },
        cached: false
      });

      expect(mockTranslationService.translateFeedback).toHaveBeenCalledTimes(8);
      expect(mockTranslationService.translateFeedback).toHaveBeenCalledWith(
        'You have shown great potential',
        'fr',
        'software_engineer'
      );
    });

    it('returns cached translation if available', async () => {
      const evaluationWithCached = {
        ...mockEvaluation,
        metadata: {
          ...mockEvaluation.metadata,
          qualitativeFeedbackVersions: {
            fr: {
              overallAssessment: 'Cached French translation',
              careerAlignment: 'Cached alignment',
              strengths: ['Cached strength'],
              growthAreas: ['Cached growth'],
              nextSteps: ['Cached step']
            }
          }
        }
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue([evaluationWithCached]);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        translatedFeedback: evaluationWithCached.metadata.qualitativeFeedbackVersions.fr,
        cached: true
      });
      expect(mockTranslationService.translateFeedback).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 400 when target language missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Target language required' });
    });

    it('returns 404 when program not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Program not found or access denied' });
    });

    it('returns 404 when user does not own program', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        userId: 'other@example.com'
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Program not found or access denied' });
    });

    it('returns 404 when no feedback to translate', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'No feedback to translate' });
    });

    it('handles translation errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue([mockEvaluation]);
      mockTranslationService.translateFeedback.mockRejectedValue(new Error('Translation API failed'));

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'program123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to translate feedback' });
    });

    it('uses default career type when not specified', async () => {
      const evaluationWithoutCareer = {
        ...mockEvaluation,
        metadata: {
          ...mockEvaluation.metadata,
          careerType: undefined
        }
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue([evaluationWithoutCareer]);
      mockTranslationService.translateFeedback.mockResolvedValue('Translated text');

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/translate-feedback', {
        method: 'POST',
        body: JSON.stringify({ targetLanguage: 'fr' })
      });

      await POST(request, { params: Promise.resolve({ programId: 'program123' }) });

      expect(mockTranslationService.translateFeedback).toHaveBeenCalledWith(
        expect.any(String),
        'fr',
        'general'
      );
    });
  });
});
