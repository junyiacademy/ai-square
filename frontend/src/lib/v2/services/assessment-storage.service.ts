/**
 * Assessment Storage Service
 * Handles all assessment data persistence using GCS as a database
 */

import { GCSStorageProvider } from '@/lib/core/storage/providers/gcs-storage.provider';
import { 
  AssessmentSession, 
  UserAssessmentHistory,
  validateAssessmentSession,
  validateUserHistory,
  assessmentSessionSchema,
  userAssessmentHistorySchema
} from '../schemas/assessment.schema';

export class AssessmentStorageService {
  private storage: GCSStorageProvider;
  private readonly BUCKET_NAME = 'ai-square-db';
  private readonly ASSESSMENT_PREFIX = 'v2/assessments';
  private readonly USER_HISTORY_PREFIX = 'v2/user-history';

  constructor() {
    this.storage = new GCSStorageProvider(this.BUCKET_NAME, '');
  }

  /**
   * Save a new assessment session
   */
  async saveAssessmentSession(session: AssessmentSession): Promise<void> {
    // Validate data
    const validatedSession = validateAssessmentSession(session);
    
    // Save to user's assessment folder
    const userPath = `${this.ASSESSMENT_PREFIX}/${session.userEmail}/${session.id}.json`;
    await this.storage.set(userPath, validatedSession);
    
    // Update user history
    await this.updateUserHistory(session.userEmail, validatedSession);
  }

  /**
   * Get an assessment session by ID
   */
  async getAssessmentSession(userEmail: string, sessionId: string): Promise<AssessmentSession | null> {
    try {
      const path = `${this.ASSESSMENT_PREFIX}/${userEmail}/${sessionId}.json`;
      const data = await this.storage.get(path);
      return validateAssessmentSession(data);
    } catch (error) {
      console.error('Failed to get assessment session:', error);
      return null;
    }
  }

  /**
   * Get all assessment sessions for a user
   */
  async getUserAssessments(userEmail: string): Promise<AssessmentSession[]> {
    try {
      const prefix = `${this.ASSESSMENT_PREFIX}/${userEmail}/`;
      const sessions = await this.storage.list<AssessmentSession>(prefix);
      
      // Validate each session
      const validatedSessions: AssessmentSession[] = [];
      for (const session of sessions) {
        try {
          validatedSessions.push(validateAssessmentSession(session));
        } catch (error) {
          console.error(`Failed to validate assessment:`, error);
        }
      }
      
      // Sort by completedAt descending
      return validatedSessions.sort((a, b) => {
        const dateA = a.completedAt || a.startedAt;
        const dateB = b.completedAt || b.startedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    } catch (error) {
      console.error('Failed to get user assessments:', error);
      return [];
    }
  }

  /**
   * Update assessment session (e.g., adding responses)
   */
  async updateAssessmentSession(
    userEmail: string, 
    sessionId: string, 
    updates: Partial<AssessmentSession>
  ): Promise<void> {
    const existing = await this.getAssessmentSession(userEmail, sessionId);
    if (!existing) {
      throw new Error('Assessment session not found');
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const validated = validateAssessmentSession(updated);
    const path = `${this.ASSESSMENT_PREFIX}/${userEmail}/${sessionId}.json`;
    await this.storage.set(path, validated);
  }

  /**
   * Get user assessment history
   */
  async getUserHistory(userEmail: string): Promise<UserAssessmentHistory | null> {
    try {
      const path = `${this.USER_HISTORY_PREFIX}/${userEmail}.json`;
      const data = await this.storage.get(path);
      return validateUserHistory(data);
    } catch (error) {
      // Return empty history if not found
      return {
        userEmail,
        assessments: [],
        stats: {
          totalAssessments: 0,
          averageScore: 0,
          bestScore: 0,
          lastAssessmentDate: new Date().toISOString(),
          certificatesEarned: 0,
          domainProgress: {},
          ksaProgress: {
            knowledge: 0,
            skills: 0,
            attitudes: 0
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Update user history after completing an assessment
   */
  private async updateUserHistory(userEmail: string, session: AssessmentSession): Promise<void> {
    if (session.status !== 'completed' || !session.results) {
      return; // Only update history for completed assessments
    }
    
    const history = await this.getUserHistory(userEmail) || {
      userEmail,
      assessments: [],
      stats: {
        totalAssessments: 0,
        averageScore: 0,
        bestScore: 0,
        lastAssessmentDate: new Date().toISOString(),
        certificatesEarned: 0,
        domainProgress: {},
        ksaProgress: { knowledge: 0, skills: 0, attitudes: 0 }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add new assessment
    history.assessments.push({
      id: session.id,
      completedAt: session.completedAt!,
      score: session.results.overallScore,
      passed: session.results.passed,
      certificateId: session.results.certificate?.id
    });
    
    // Update stats
    history.stats.totalAssessments = history.assessments.length;
    history.stats.averageScore = history.assessments.reduce((sum, a) => sum + a.score, 0) / history.assessments.length;
    history.stats.bestScore = Math.max(...history.assessments.map(a => a.score));
    history.stats.lastAssessmentDate = session.completedAt!;
    
    if (session.results.certificate) {
      history.stats.certificatesEarned++;
    }
    
    // Update domain progress
    for (const [domain, score] of Object.entries(session.results.domainScores)) {
      if (!history.stats.domainProgress[domain]) {
        history.stats.domainProgress[domain] = {
          averageScore: score,
          assessmentCount: 1,
          trend: 'stable'
        };
      } else {
        const progress = history.stats.domainProgress[domain];
        const oldAverage = progress.averageScore;
        progress.assessmentCount++;
        progress.averageScore = ((oldAverage * (progress.assessmentCount - 1)) + score) / progress.assessmentCount;
        
        // Calculate trend
        if (score > oldAverage + 5) progress.trend = 'improving';
        else if (score < oldAverage - 5) progress.trend = 'declining';
        else progress.trend = 'stable';
      }
    }
    
    // Update KSA progress
    history.stats.ksaProgress = session.results.ksaScores;
    
    history.updatedAt = new Date().toISOString();
    
    // Save updated history
    const validatedHistory = validateUserHistory(history);
    const path = `${this.USER_HISTORY_PREFIX}/${userEmail}.json`;
    await this.storage.set(path, validatedHistory);
  }

  /**
   * Get assessment analytics for a user
   */
  async getUserAnalytics(userEmail: string): Promise<{
    totalAssessments: number;
    averageScore: number;
    improvementRate: number;
    strongestDomain: string;
    weakestDomain: string;
    recentTrend: 'improving' | 'stable' | 'declining';
  }> {
    const history = await this.getUserHistory(userEmail);
    if (!history || history.assessments.length === 0) {
      return {
        totalAssessments: 0,
        averageScore: 0,
        improvementRate: 0,
        strongestDomain: 'none',
        weakestDomain: 'none',
        recentTrend: 'stable'
      };
    }
    
    // Get recent assessments for trend
    const recentAssessments = history.assessments
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5);
    
    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAssessments.length >= 3) {
      const recentAvg = recentAssessments.slice(0, 3).reduce((sum, a) => sum + a.score, 0) / 3;
      const olderAvg = recentAssessments.slice(-3).reduce((sum, a) => sum + a.score, 0) / 3;
      
      if (recentAvg > olderAvg + 5) recentTrend = 'improving';
      else if (recentAvg < olderAvg - 5) recentTrend = 'declining';
    }
    
    // Find strongest and weakest domains
    const domainScores = Object.entries(history.stats.domainProgress)
      .map(([domain, stats]) => ({ domain, score: stats.averageScore }))
      .sort((a, b) => b.score - a.score);
    
    const strongestDomain = domainScores[0]?.domain || 'none';
    const weakestDomain = domainScores[domainScores.length - 1]?.domain || 'none';
    
    // Calculate improvement rate
    const firstScore = history.assessments[0]?.score || 0;
    const lastScore = history.assessments[history.assessments.length - 1]?.score || 0;
    const improvementRate = firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;
    
    return {
      totalAssessments: history.stats.totalAssessments,
      averageScore: history.stats.averageScore,
      improvementRate,
      strongestDomain,
      weakestDomain,
      recentTrend
    };
  }

  /**
   * Generate a verification code for certificates
   */
  generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}