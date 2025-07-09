import { Storage } from '@google-cloud/storage';
import { GCS_CONFIG, getStorageConfig } from '@/lib/config/gcs.config';

// Initialize GCS client
const storage = new Storage(getStorageConfig());

const BUCKET_NAME = GCS_CONFIG.bucketName;

export interface AssessmentResultGCS {
  assessment_id: string;
  user_id: string;
  user_email?: string;
  timestamp: string;
  duration_seconds: number;
  language: string;
  scores: {
    overall: number;
    domains: {
      engaging_with_ai: number;
      creating_with_ai: number;
      managing_with_ai: number;
      designing_with_ai: number;
    };
  };
  summary: {
    total_questions: number;
    correct_answers: number;
    level: string;
  };
  answers: Array<{
    question_id: string;
    selected: string;
    correct: string;
    time_spent: number;
  }>;
}

export class GCSStorageService {
  private bucket = storage.bucket(BUCKET_NAME);

  constructor() {
    console.log('GCS Service initialized with bucket:', BUCKET_NAME);
  }

  async saveAssessmentResult(userId: string, result: AssessmentResultGCS): Promise<string> {
    const assessmentId = result.assessment_id;
    const filePath = `user_assessment_logs/${userId}/${assessmentId}.json`;
    
    const file = this.bucket.file(filePath);
    const contents = JSON.stringify(result, null, 2);
    
    try {
      console.log(`Attempting to save to GCS: ${filePath}`);
      console.log('User ID:', userId);
      console.log('Assessment ID:', assessmentId);
      
      await file.save(contents, {
        metadata: {
          contentType: 'application/json',
        },
      });
      
      console.log(`✅ Assessment saved successfully to GCS: ${filePath}`);
      return assessmentId;
    } catch (error) {
      console.error('❌ Error saving to GCS:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        throw new Error(`Failed to save assessment result: ${error.message}`);
      }
      throw new Error('Failed to save assessment result');
    }
  }

  async getUserAssessments(userId: string): Promise<AssessmentResultGCS[]> {
    const prefix = `user_assessment_logs/${userId}/`;
    
    try {
      const [files] = await this.bucket.getFiles({ prefix });
      
      const assessments: AssessmentResultGCS[] = [];
      
      for (const file of files) {
        const [contents] = await file.download();
        const assessment = JSON.parse(contents.toString()) as AssessmentResultGCS;
        assessments.push(assessment);
      }
      
      // Sort by timestamp (newest first)
      assessments.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      return assessments;
    } catch (error) {
      console.error('Error fetching from GCS:', error);
      throw new Error('Failed to fetch assessment results');
    }
  }

  async getAssessmentById(userId: string, assessmentId: string): Promise<AssessmentResultGCS | null> {
    const filePath = `user_assessment_logs/${userId}/${assessmentId}.json`;
    const file = this.bucket.file(filePath);
    
    try {
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }
      
      const [contents] = await file.download();
      return JSON.parse(contents.toString()) as AssessmentResultGCS;
    } catch (error) {
      console.error('Error fetching assessment:', error);
      return null;
    }
  }
}

// Singleton instance
export const gcsStorage = new GCSStorageService();