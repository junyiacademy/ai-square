/**
 * Assessment YAML Loader
 * 繼承自 BaseYAMLLoader，專門處理 Assessment YAML 檔案
 */

import { BaseYAMLLoader, LoadResult } from '@/lib/abstractions/base-yaml-loader';
import path from 'path';

export interface AssessmentConfig {
  title?: string;
  title_zhTW?: string;
  title_es?: string;
  title_ja?: string;
  title_ko?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  description?: string;
  description_zhTW?: string;
  description_es?: string;
  description_ja?: string;
  description_ko?: string;
  description_fr?: string;
  description_de?: string;
  description_ru?: string;
  description_it?: string;
  total_questions?: number;
  time_limit_minutes?: number;
  passing_score?: number;
  domains?: string[];
}

export interface AssessmentQuestion {
  id: string;
  domain: string;
  competency: string;
  question: string;
  question_zhTW?: string;
  question_es?: string;
  question_ja?: string;
  question_ko?: string;
  question_fr?: string;
  question_de?: string;
  question_ru?: string;
  question_it?: string;
  options: string[];
  correct_answer: string | number;
  explanation?: string;
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

export interface AssessmentYAMLData {
  config?: AssessmentConfig;
  assessment_config?: AssessmentConfig; // Alternative key
  questions: AssessmentQuestion[];
}

export class AssessmentYAMLLoader extends BaseYAMLLoader<AssessmentYAMLData> {
  protected readonly loaderName = 'AssessmentYAMLLoader';

  private basePath: string;

  constructor() {
    super();
    // Set base path for assessment data
    this.basePath = path.join(process.cwd(), 'public', 'assessment_data');
  }

  /**
   * Implement abstract load method
   */
  async load(fileName: string): Promise<LoadResult<AssessmentYAMLData>> {
    try {
      const filePath = this.getFilePath(fileName);
      const { promises: fs } = await import('fs');
      const yaml = await import('js-yaml');

      const content = await fs.readFile(filePath, 'utf8');
      const data = yaml.load(content) as AssessmentYAMLData;

      return { data };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Load assessment YAML file with proper type checking
   */
  async loadAssessment(
    assessmentName: string,
    language: string = 'en'
  ): Promise<AssessmentYAMLData | null> {
    // Try language-specific file first
    const fileName = `${assessmentName}_questions_${language}`;
    const result = await this.load(fileName);

    if (result.data) {
      return result.data;
    }

    // Fallback to English if language-specific file not found
    if (language !== 'en') {
      console.log(`Language-specific file not found for ${language}, falling back to English`);
      const fallbackFileName = `${assessmentName}_questions_en`;
      const fallbackResult = await this.load(fallbackFileName);

      if (fallbackResult.data) {
        return fallbackResult.data;
      }
    }

    return null;
  }

  /**
   * Scan all available assessment folders
   */
  async scanAssessments(): Promise<string[]> {
    const fs = await import('fs/promises');
    const assessmentDir = this.basePath;

    try {
      const items = await fs.readdir(assessmentDir, { withFileTypes: true });
      return items
        .filter(item => item.isDirectory())
        .map(item => item.name);
    } catch (error) {
      console.error('Error scanning assessment directory:', error);
      return [];
    }
  }

  /**
   * Get all available languages for an assessment
   */
  async getAvailableLanguages(assessmentName: string): Promise<string[]> {
    const fs = await import('fs/promises');
    const assessmentDir = path.join(this.basePath, assessmentName);

    try {
      const files = await fs.readdir(assessmentDir);
      const languagePattern = new RegExp(`${assessmentName}_questions_(\\w+)\\.yaml`);

      return files
        .map(file => {
          const match = file.match(languagePattern);
          return match ? match[1] : null;
        })
        .filter((lang): lang is string => lang !== null);
    } catch (error) {
      console.error(`Error scanning languages for ${assessmentName}:`, error);
      return [];
    }
  }

  /**
   * Override to handle Assessment-specific validation
   */
  protected async validateData(): Promise<{ valid: boolean; error?: string }> {
    // Assessment-specific validation can be added here
    return { valid: true };
  }

  /**
   * Override to handle Assessment-specific post-processing
   */
  protected async postProcess(data: AssessmentYAMLData): Promise<AssessmentYAMLData> {
    // Normalize config field (could be 'config' or 'assessment_config')
    if (!data.config && data.assessment_config) {
      data.config = data.assessment_config;
    }

    // Ensure questions have IDs
    if (data.questions) {
      data.questions = data.questions.map((q, index) => ({
        ...q,
        id: q.id || `question_${index + 1}`
      }));
    }

    return data;
  }

  /**
   * Override to provide custom file path resolution
   */
  protected getFilePath(fileName: string): string {
    // Assessment files are in subdirectories
    const assessmentName = fileName.replace(/_questions_\w+$/, '');
    return path.join(this.basePath, assessmentName, `${fileName}.yaml`);
  }

  /**
   * Get translated field helper specific to Assessment
   */
  getTranslatedField(data: Record<string, unknown>, fieldName: string, language: string): string {
    const suffix = language === 'en' ? '' : `_${language}`;
    const fieldWithSuffix = `${fieldName}${suffix}`;

    return (data[fieldWithSuffix] as string) || (data[fieldName] as string) || '';
  }
}

// Export singleton instance
export const assessmentYAMLLoader = new AssessmentYAMLLoader();
