/**
 * Source Content Repository for V2 Architecture
 * Manages PBL Scenarios, Discovery Careers, and Assessment Exams
 */

import { BaseRepository } from './base.repository';
import { SourceContent } from '@/lib/v2/interfaces/base';

export class SourceContentRepository extends BaseRepository<SourceContent> {
  constructor(storageService: any) {
    super('source_content', storageService);
  }

  async findByType(type: 'pbl' | 'discovery' | 'assessment'): Promise<SourceContent[]> {
    return this.findMany({
      where: { 
        type: type,
        is_active: true
      }
    });
  }

  async findByCode(code: string): Promise<SourceContent | null> {
    return this.findOne({
      where: { code: code }
    });
  }

  async findActive(): Promise<SourceContent[]> {
    return this.findMany({
      where: { is_active: true }
    });
  }

  protected mapToEntity(data: any): SourceContent {
    return {
      id: data.id,
      type: data.type,
      code: data.code,
      title: data.title,
      description: data.description,
      objectives: data.objectives || [],
      prerequisites: data.prerequisites || [],
      metadata: data.metadata || {},
      is_active: data.is_active !== false,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}