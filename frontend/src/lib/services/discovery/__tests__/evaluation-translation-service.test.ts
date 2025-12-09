import { EvaluationTranslationService } from '../evaluation-translation-service';
import { TranslationService } from '@/lib/services/translation-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock dependencies
jest.mock('@/lib/services/translation-service');
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getTaskRepository: jest.fn(),
  }
}));

describe('EvaluationTranslationService', () => {
  let mockTaskRepo: {
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTaskRepo = {
      update: jest.fn(),
    };

    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
  });

  describe('getOrTranslateFeedback', () => {
    it('should return existing translation if available', async () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z',
        feedbackData: {
          en: 'Good work!',
          zhTW: '做得好！'
        }
      };

      const result = await EvaluationTranslationService.getOrTranslateFeedback(
        evaluation,
        'zhTW',
        'software_engineer',
        'task-1',
        {}
      );

      expect(result.feedback).toBe('做得好！');
      expect(result.feedbackVersions).toEqual({
        en: 'Good work!',
        zhTW: '做得好！'
      });
      expect(TranslationService.prototype.translateFeedback).not.toHaveBeenCalled();
    });

    it('should translate when requested language not available', async () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z',
        feedbackData: {
          en: 'Good work!'
        }
      };

      (TranslationService.prototype.translateFeedback as jest.Mock).mockResolvedValue('做得好！');
      mockTaskRepo.update.mockResolvedValue(undefined);

      const result = await EvaluationTranslationService.getOrTranslateFeedback(
        evaluation,
        'zhTW',
        'software_engineer',
        'task-1',
        { existing: 'metadata' }
      );

      expect(result.feedback).toBe('做得好！');
      expect(result.feedbackVersions).toEqual({
        en: 'Good work!',
        zhTW: '做得好！'
      });

      expect(TranslationService.prototype.translateFeedback).toHaveBeenCalledWith(
        'Good work!',
        'zhTW',
        'software_engineer'
      );

      expect(mockTaskRepo.update).toHaveBeenCalledWith('task-1', {
        metadata: {
          existing: 'metadata',
          evaluationFeedbackVersions: {
            en: 'Good work!',
            zhTW: '做得好！'
          }
        }
      });
    });

    it('should use fallback on translation error', async () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z',
        feedbackData: {
          en: 'Good work!'
        }
      };

      (TranslationService.prototype.translateFeedback as jest.Mock).mockRejectedValue(
        new Error('Translation API error')
      );
      (TranslationService.getFeedbackByLanguage as jest.Mock).mockReturnValue('Good work!');

      const result = await EvaluationTranslationService.getOrTranslateFeedback(
        evaluation,
        'zhTW',
        'software_engineer',
        'task-1',
        {}
      );

      expect(result.feedback).toBe('Good work!');
      expect(result.feedbackVersions).toEqual({
        en: 'Good work!'
      });
      expect(TranslationService.getFeedbackByLanguage).toHaveBeenCalledWith(
        { en: 'Good work!' },
        'zhTW',
        'en'
      );
    });

    it('should handle English as source and target', async () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z',
        feedbackData: {
          en: 'Good work!'
        }
      };

      const result = await EvaluationTranslationService.getOrTranslateFeedback(
        evaluation,
        'en',
        'software_engineer',
        'task-1',
        {}
      );

      expect(result.feedback).toBe('Good work!');
      expect(TranslationService.prototype.translateFeedback).not.toHaveBeenCalled();
    });
  });

  describe('extractExistingVersions', () => {
    it('should extract from feedbackData first', () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z',
        feedbackData: {
          en: 'Good work!',
          zhTW: '做得好！'
        },
        metadata: {
          feedbackVersions: {
            en: 'Old version'
          }
        }
      };

      const versions = EvaluationTranslationService.extractExistingVersions(evaluation);

      expect(versions).toEqual({
        en: 'Good work!',
        zhTW: '做得好！'
      });
    });

    it('should fallback to metadata.feedbackVersions', () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z',
        feedbackData: null,
        metadata: {
          feedbackVersions: {
            en: 'Good work!',
            zhTW: '做得好！'
          }
        }
      };

      const versions = EvaluationTranslationService.extractExistingVersions(evaluation);

      expect(versions).toEqual({
        en: 'Good work!',
        zhTW: '做得好！'
      });
    });

    it('should return empty object when no versions available', () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z',
        feedbackData: null,
        metadata: null
      };

      const versions = EvaluationTranslationService.extractExistingVersions(evaluation);

      expect(versions).toEqual({});
    });
  });

  describe('buildProcessedEvaluation', () => {
    it('should build evaluation response correctly', () => {
      const evaluation = {
        id: 'eval-1',
        score: 85,
        feedbackText: 'Good work!',
        createdAt: '2024-01-01T12:00:00Z'
      };

      const feedbackVersions = {
        en: 'Good work!',
        zhTW: '做得好！'
      };

      const result = EvaluationTranslationService.buildProcessedEvaluation(
        evaluation,
        '做得好！',
        feedbackVersions
      );

      expect(result).toEqual({
        id: 'eval-1',
        score: 85,
        feedback: '做得好！',
        feedbackVersions: {
          en: 'Good work!',
          zhTW: '做得好！'
        },
        evaluatedAt: '2024-01-01T12:00:00Z'
      });
    });
  });

  describe('determineSourceFeedback', () => {
    it('should prefer English version', () => {
      const existingVersions = {
        en: 'English version',
        zhTW: 'Chinese version'
      };

      const feedbackText = 'Default text';

      const result = EvaluationTranslationService.determineSourceFeedback(
        existingVersions,
        feedbackText
      );

      expect(result).toEqual({
        sourceFeedback: 'English version',
        sourceLanguage: 'en'
      });
    });

    it('should use feedbackText when no English version', () => {
      const existingVersions = {
        zhTW: 'Chinese version'
      };

      const feedbackText = 'Default text';

      const result = EvaluationTranslationService.determineSourceFeedback(
        existingVersions,
        feedbackText
      );

      expect(result).toEqual({
        sourceFeedback: 'Default text',
        sourceLanguage: 'en'
      });
    });

    it('should throw when no source available', () => {
      const existingVersions = {};
      const feedbackText = undefined;

      expect(() => {
        EvaluationTranslationService.determineSourceFeedback(
          existingVersions,
          feedbackText as unknown as string
        );
      }).toThrow('No source feedback available for translation');
    });
  });
});
