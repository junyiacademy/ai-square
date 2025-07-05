/**
 * Assessment Track Adapter
 * 將現有的 Assessment 服務適配到新的 Track 架構
 */

import { trackService } from '../services';
import { 
  TrackType, 
  TrackStatus, 
  AssessmentTrackContext,
  AssessmentAnswer,
  AssessmentSettings,
  EvaluationType,
  AssessmentEvaluationData,
  QuestionEvaluation
} from '../types';
import { UserDataService } from '@/lib/services/user-data-service';

export class AssessmentTrackAdapter {
  private userDataService: UserDataService;

  constructor() {
    this.userDataService = new UserDataService();
  }

  /**
   * 創建新的 Assessment Track
   */
  async createAssessmentTrack(
    userId: string,
    projectId: string,
    assessmentId: string,
    assessmentType: 'quiz' | 'exam' | 'practice' = 'quiz',
    settings?: Partial<AssessmentSettings>,
    language: string = 'en'
  ) {
    // 預設設定
    const defaultSettings: AssessmentSettings = {
      randomizeQuestions: false,
      showFeedback: true,
      allowSkip: true,
      timeLimit: assessmentType === 'exam' ? 3600 : undefined // 考試 60 分鐘
    };

    // 創建 Track
    const track = await trackService.createTrack({
      userId,
      projectId,
      type: TrackType.ASSESSMENT,
      metadata: {
        language,
        title: `Assessment: ${assessmentId}`,
        tags: ['assessment', assessmentType, assessmentId]
      },
      context: {
        type: 'assessment',
        assessmentId,
        currentQuestionIndex: 0,
        answers: [],
        timeSpent: 0,
        settings: { ...defaultSettings, ...settings }
      }
    });

    // 同步到舊系統（為了向後兼容）
    await this.userDataService.startAssessment({
      assessmentId,
      type: assessmentType,
      startedAt: new Date(),
      language
    });

    return track;
  }

  /**
   * 提交答案
   */
  async submitAnswer(
    trackId: string,
    questionId: string,
    answer: string | string[],
    confidence?: number
  ) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.ASSESSMENT) {
      throw new Error('Invalid Assessment track');
    }

    // 提交答案
    await trackService.submitAssessmentAnswer(
      trackId,
      questionId,
      answer,
      confidence
    );

    // 同步到舊系統
    const context = track.context as AssessmentTrackContext;
    await this.userDataService.saveAssessmentAnswer(
      context.assessmentId,
      questionId,
      answer
    );

    return { 
      questionId, 
      saved: true,
      currentIndex: context.currentQuestionIndex 
    };
  }

  /**
   * 跳過問題
   */
  async skipQuestion(trackId: string, questionId: string) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.ASSESSMENT) {
      throw new Error('Invalid Assessment track');
    }

    const context = track.context as AssessmentTrackContext;
    
    if (!context.settings.allowSkip) {
      throw new Error('Skipping is not allowed in this assessment');
    }

    // 記錄為跳過
    await trackService.submitAssessmentAnswer(
      trackId,
      questionId,
      '',
      0 // confidence = 0 表示跳過
    );

    return { questionId, skipped: true };
  }

  /**
   * 完成測驗並評估
   */
  async completeAssessment(
    trackId: string,
    correctAnswers: Record<string, string | string[]>
  ) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.ASSESSMENT) {
      throw new Error('Invalid Assessment track');
    }

    const context = track.context as AssessmentTrackContext;
    
    // 完成 Track
    await trackService.completeTrack(trackId);

    // 評估答案
    const questionEvaluations: QuestionEvaluation[] = [];
    let correctCount = 0;
    
    for (const answer of context.answers) {
      const correctAnswer = correctAnswers[answer.questionId];
      const isCorrect = this.checkAnswer(answer.answer, correctAnswer);
      
      if (isCorrect) correctCount++;
      
      questionEvaluations.push({
        questionId: answer.questionId,
        userAnswer: answer.answer,
        correctAnswer: correctAnswer,
        isCorrect,
        score: isCorrect ? 10 : 0,
        maxScore: 10,
        timeSpent: answer.timeSpent
      });
    }

    // 創建評估
    const evaluation = await trackService.createEvaluation({
      trackId,
      userId: track.userId,
      type: EvaluationType.ASSESSMENT,
      evaluationData: {
        type: 'assessment',
        assessmentId: context.assessmentId,
        questions: questionEvaluations,
        totalQuestions: questionEvaluations.length,
        correctAnswers: correctCount,
        timeSpent: context.timeSpent,
        completionRate: (context.answers.length / questionEvaluations.length) * 100
      } as AssessmentEvaluationData
    });

    // 計算總分
    const totalScore = (correctCount / questionEvaluations.length) * 100;
    
    // 生成反饋
    const feedback = this.generateFeedback(totalScore, questionEvaluations);
    
    // 完成評估
    await trackService.completeEvaluation(evaluation.id, totalScore, feedback);

    // 同步到舊系統
    await this.userDataService.saveAssessmentResult(
      context.assessmentId,
      {
        score: totalScore,
        correctAnswers: correctCount,
        totalQuestions: questionEvaluations.length,
        completedAt: new Date()
      }
    );

    return {
      trackId,
      evaluation,
      score: totalScore,
      correctAnswers: correctCount,
      totalQuestions: questionEvaluations.length
    };
  }

  /**
   * 暫停測驗
   */
  async pauseAssessment(trackId: string) {
    await trackService.pauseTrack(trackId);
    
    const track = await trackService.getTrack(trackId);
    if (track) {
      const context = track.context as AssessmentTrackContext;
      await this.userDataService.pauseAssessment(context.assessmentId);
    }
  }

  /**
   * 恢復測驗
   */
  async resumeAssessment(trackId: string) {
    await trackService.resumeTrack(trackId);
    
    const track = await trackService.getTrack(trackId);
    if (track) {
      const context = track.context as AssessmentTrackContext;
      await this.userDataService.resumeAssessment(context.assessmentId);
    }
  }

  /**
   * 從舊系統遷移 Assessment 數據
   */
  async migrateLegacyAssessmentData(userId: string) {
    const assessmentResults = await this.userDataService.getAssessmentResults();
    const migratedTracks = [];
    
    for (const result of assessmentResults) {
      // 檢查是否已經遷移
      const existingTracks = await trackService.queryTracks({
        userId,
        type: TrackType.ASSESSMENT
      });
      
      const alreadyMigrated = existingTracks.some(t => {
        const ctx = t.context as AssessmentTrackContext;
        return ctx.assessmentId === result.assessmentId;
      });
      
      if (!alreadyMigrated) {
        // 創建新的 Track
        const track = await this.createAssessmentTrack(
          userId,
          'migrated',
          result.assessmentId,
          'quiz',
          {},
          result.language || 'en'
        );
        
        // 如果已完成，更新狀態
        if (result.completed) {
          await trackService.completeTrack(track.id);
          
          // 創建評估記錄
          const evaluation = await trackService.createEvaluation({
            trackId: track.id,
            userId,
            type: EvaluationType.ASSESSMENT,
            evaluationData: {
              type: 'assessment',
              assessmentId: result.assessmentId,
              questions: [],
              totalQuestions: result.totalQuestions || 0,
              correctAnswers: result.correctAnswers || 0,
              timeSpent: 0,
              completionRate: 100
            } as AssessmentEvaluationData
          });
          
          await trackService.completeEvaluation(
            evaluation.id,
            result.score || 0,
            {
              summary: 'Migrated from legacy system',
              strengths: [],
              improvements: [],
              suggestions: []
            }
          );
        }
        
        migratedTracks.push(track);
      }
    }
    
    return migratedTracks;
  }

  /**
   * 獲取 Assessment Track 詳情
   */
  async getAssessmentTrackDetails(trackId: string) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.ASSESSMENT) {
      throw new Error('Invalid Assessment track');
    }

    const context = track.context as AssessmentTrackContext;
    const evaluations = await trackService.getTrackEvaluations(trackId);
    
    return {
      track,
      progress: {
        currentQuestion: context.currentQuestionIndex,
        answeredQuestions: context.answers.length,
        timeSpent: context.timeSpent,
        settings: context.settings
      },
      answers: context.answers,
      evaluations,
      stats: this.calculateStats(context, evaluations)
    };
  }

  /**
   * 獲取用戶的測驗歷史
   */
  async getUserAssessmentHistory(userId: string) {
    const tracks = await trackService.queryTracks({
      userId,
      type: TrackType.ASSESSMENT,
      status: TrackStatus.COMPLETED
    });

    const history = [];
    
    for (const track of tracks) {
      const evaluations = await trackService.getTrackEvaluations(track.id);
      const latestEvaluation = evaluations[evaluations.length - 1];
      
      if (latestEvaluation) {
        const data = latestEvaluation.evaluationData as AssessmentEvaluationData;
        history.push({
          trackId: track.id,
          assessmentId: data.assessmentId,
          completedAt: track.completedAt,
          score: latestEvaluation.score,
          correctAnswers: data.correctAnswers,
          totalQuestions: data.totalQuestions,
          timeSpent: data.timeSpent
        });
      }
    }
    
    return history;
  }

  /**
   * 檢查答案是否正確
   */
  private checkAnswer(
    userAnswer: string | string[], 
    correctAnswer: string | string[]
  ): boolean {
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      return userAnswer.sort().join(',') === correctAnswer.sort().join(',');
    }
    return userAnswer === correctAnswer;
  }

  /**
   * 生成反饋
   */
  private generateFeedback(score: number, evaluations: QuestionEvaluation[]) {
    let summary = '';
    const strengths = [];
    const improvements = [];
    const suggestions = [];
    
    if (score >= 90) {
      summary = 'Excellent performance! You have mastered this topic.';
      strengths.push('Strong understanding of all concepts');
      strengths.push('Consistent accuracy across questions');
    } else if (score >= 70) {
      summary = 'Good job! You have a solid understanding of the material.';
      strengths.push('Good grasp of core concepts');
      improvements.push('Review the questions you missed');
    } else if (score >= 50) {
      summary = 'You passed, but there\'s room for improvement.';
      strengths.push('Basic understanding demonstrated');
      improvements.push('Need to strengthen fundamental concepts');
      suggestions.push('Review the study materials again');
    } else {
      summary = 'You need more practice with this material.';
      improvements.push('Fundamental concepts need reinforcement');
      suggestions.push('Consider reviewing the lessons before retaking');
      suggestions.push('Practice with simpler examples first');
    }
    
    // 分析錯誤模式
    const incorrectQuestions = evaluations.filter(e => !e.isCorrect);
    if (incorrectQuestions.length > 0) {
      suggestions.push(`Focus on reviewing questions: ${incorrectQuestions.map(q => q.questionId).join(', ')}`);
    }
    
    return {
      summary,
      strengths,
      improvements,
      suggestions
    };
  }

  /**
   * 計算統計資料
   */
  private calculateStats(context: AssessmentTrackContext, evaluations: any[]) {
    const totalTime = context.timeSpent;
    const avgTimePerQuestion = context.answers.length > 0 
      ? totalTime / context.answers.length 
      : 0;
    
    const confidenceScores = context.answers
      .filter(a => a.confidence !== undefined)
      .map(a => a.confidence || 0);
    
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
      : 0;
    
    return {
      totalTimeMinutes: Math.round(totalTime / 60),
      avgTimePerQuestion: Math.round(avgTimePerQuestion),
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      completionRate: evaluations.length > 0 ? 100 : 0
    };
  }
}