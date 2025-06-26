import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { ContentItem, ContentType, ContentHistory, ContentStatus } from '@/types/cms';

interface ContentMetadata {
  version: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  gcs_path?: string;
  published_at?: Date;
  published_by?: string;
}

// GCS paths structure
const GCS_PATHS = {
  overrides: 'cms/overrides/',      // Active overrides
  drafts: 'cms/drafts/',           // Work in progress
  history: 'cms/history/',         // Version history
  metadata: 'cms/metadata/'        // Content metadata
};

export class ContentService {
  private storage?: Storage;
  private bucket?: ReturnType<Storage['bucket']>;
  private isProduction: boolean;
  
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    if (process.env.GCS_BUCKET_NAME) {
      try {
        this.storage = new Storage({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
        this.bucket = this.storage.bucket(process.env.GCS_BUCKET_NAME);
      } catch (error) {
        console.error('ContentService: Failed to initialize GCS:', error);
      }
    }
  }

  // Get content with GCS override check
  async getContent(type: ContentType, fileName: string): Promise<unknown> {
    // 1. Read base content from repo
    const baseContent = await this.readFromRepo(type, fileName);
    
    // 2. Check for GCS override
    if (this.bucket) {
      const override = await this.readFromGCS(`${GCS_PATHS.overrides}${type}/${fileName}`);
      if (override && typeof override === 'object' && override !== null) {
        return { ...(baseContent as object), ...(override as object), _source: 'gcs_override' };
      }
    }
    
    return { ...(baseContent as object), _source: 'repo' };
  }

  // List all content items
  async listContent(type: ContentType): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    
    // 1. List from repo
    // In Next.js, we need to ensure we're looking in the right directory
    const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
    const repoPath = path.join(baseDir, 'public', this.getRepoPath(type));
    
    try {
      const files = await fs.readdir(repoPath);
      
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          // Skip files that don't belong to this content type
          if (type === 'domain' && file === 'ksa_codes.yaml') continue;
          if (type === 'ksa' && file === 'ai_lit_domains.yaml') continue;
          
          const content = await this.readFromRepo(type, file);
          const metadata = await this.getMetadata(type, file);
          
          items.push({
            id: `${type}/${file}`,
            type,
            status: (metadata?.status as ContentStatus) || 'published',
            version: metadata?.version || 1,
            created_at: metadata?.created_at || new Date(),
            updated_at: metadata?.updated_at || new Date(),
            created_by: metadata?.created_by || 'system',
            updated_by: metadata?.updated_by || 'system',
            title: (content as { title?: string })?.title || file,
            description: (content as { description?: string })?.description,
            content,
            file_path: `${type}/${file}`,
            gcs_path: metadata?.gcs_path
          });
        }
      }
    } catch (error) {
      console.error('Error listing content:', error);
    }
    
    // 2. Add GCS-only items (drafts)
    if (this.bucket) {
      try {
        const [files] = await this.bucket.getFiles({ prefix: `${GCS_PATHS.drafts}${type}/` });
        
        for (const file of files) {
          const fileName = path.basename(file.name);
          const exists = items.find(item => item.file_path === `${type}/${fileName}`);
          
          if (!exists) {
            const content = await this.readFromGCS(file.name);
            const metadata = await this.getMetadata(type, fileName);
          
          items.push({
            id: `${type}/${fileName}`,
            type,
            status: 'draft',
            version: metadata?.version || 1,
            created_at: metadata?.created_at || new Date(),
            updated_at: metadata?.updated_at || new Date(),
            created_by: metadata?.created_by || 'system',
            updated_by: metadata?.updated_by || 'system',
            title: (content as { title?: string })?.title || fileName,
            description: (content as { description?: string })?.description,
            content,
            file_path: `${type}/${fileName}`,
            gcs_path: file.name
          });
        }
      }
      } catch (error) {
        console.error('Error listing GCS drafts:', error);
      }
    }
    
    return items;
  }

  // Save content to GCS
  async saveContent(
    type: ContentType, 
    fileName: string, 
    content: unknown, 
    status: 'draft' | 'published',
    user: string
  ): Promise<void> {
    if (!this.bucket) {
      throw new Error('GCS not configured');
    }
    
    const basePath = status === 'draft' ? GCS_PATHS.drafts : GCS_PATHS.overrides;
    const filePath = `${basePath}${type}/${fileName}`;
    
    // Save content
    const yamlContent = yaml.dump(content);
    const file = this.bucket.file(filePath);
    await file.save(yamlContent, {
      metadata: {
        contentType: 'application/x-yaml',
      },
    });
    
    // Update metadata
    const metadata: ContentMetadata = await this.getMetadata(type, fileName) || {
      created_at: new Date(),
      created_by: user,
      version: 0,
      status: 'draft',
      updated_at: new Date(),
      updated_by: user
    };
    
    metadata.updated_at = new Date();
    metadata.updated_by = user;
    metadata.version += 1;
    metadata.status = status;
    metadata.gcs_path = filePath;
    
    await this.saveMetadata(type, fileName, metadata);
    
    // Save to history
    await this.saveHistory(type, fileName, content, metadata.version, user, 'update');
  }

  // Delete content override
  async deleteOverride(type: ContentType, fileName: string): Promise<void> {
    if (!this.bucket) return;
    
    const overridePath = `${GCS_PATHS.overrides}${type}/${fileName}`;
    const draftPath = `${GCS_PATHS.drafts}${type}/${fileName}`;
    
    try {
      await this.bucket.file(overridePath).delete();
    } catch {
      // Ignore if not exists
    }
    
    try {
      await this.bucket.file(draftPath).delete();
    } catch {
      // Ignore if not exists
    }
  }

  // Publish draft to override
  async publish(type: ContentType, fileName: string, user: string): Promise<void> {
    if (!this.bucket) {
      throw new Error('GCS not configured');
    }
    
    const draftPath = `${GCS_PATHS.drafts}${type}/${fileName}`;
    const overridePath = `${GCS_PATHS.overrides}${type}/${fileName}`;
    
    // Copy draft to override
    const draftFile = this.bucket.file(draftPath);
    const [draftContent] = await draftFile.download();
    const overrideFile = this.bucket.file(overridePath);
    await overrideFile.save(draftContent, {
      metadata: {
        contentType: 'application/x-yaml',
      },
    });
    
    // Update metadata
    const metadata = await this.getMetadata(type, fileName);
    if (metadata) {
      metadata.status = 'published';
      metadata.published_at = new Date();
      metadata.published_by = user;
      await this.saveMetadata(type, fileName, metadata);
    }
    
    // Save to history
    const content = await this.readFromGCS(draftPath);
    await this.saveHistory(type, fileName, content, metadata?.version || 1, user, 'publish');
  }

  // Get content history
  async getHistory(type: ContentType, fileName: string): Promise<ContentHistory[]> {
    if (!this.bucket) return [];
    
    const prefix = `${GCS_PATHS.history}${type}/${fileName}/`;
    const [files] = await this.bucket.getFiles({ prefix });
    
    const history: ContentHistory[] = [];
    
    for (const file of files) {
      const [content] = await file.download();
      const data = JSON.parse(content.toString());
      history.push(data);
    }
    
    return history.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Private helper methods
  private async readFromRepo(type: ContentType, fileName: string): Promise<unknown> {
    // In Next.js, we need to ensure we're looking in the right directory
    const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
    const filePath = path.join(baseDir, 'public', this.getRepoPath(type), fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return yaml.load(content);
    } catch {
      console.warn(`File not found: ${filePath}`);
      return null;
    }
  }

  private async readFromGCS(filePath: string): Promise<unknown> {
    if (!this.bucket) return null;
    
    try {
      const file = this.bucket.file(filePath);
      const [content] = await file.download();
      return yaml.load(content.toString());
    } catch {
      return null;
    }
  }

  private async getMetadata(type: ContentType, fileName: string): Promise<ContentMetadata | null> {
    if (!this.bucket) return null;
    
    const metadataPath = `${GCS_PATHS.metadata}${type}/${fileName}.meta.json`;
    
    try {
      const file = this.bucket.file(metadataPath);
      const [content] = await file.download();
      return JSON.parse(content.toString()) as ContentMetadata;
    } catch {
      return null;
    }
  }

  private async saveMetadata(type: ContentType, fileName: string, metadata: ContentMetadata): Promise<void> {
    if (!this.bucket) return;
    
    const metadataPath = `${GCS_PATHS.metadata}${type}/${fileName}.meta.json`;
    const file = this.bucket.file(metadataPath);
    await file.save(JSON.stringify(metadata, null, 2), {
      metadata: { contentType: 'application/json' }
    });
  }

  private async saveHistory(
    type: ContentType, 
    fileName: string, 
    content: unknown, 
    version: number,
    user: string,
    action: string
  ): Promise<void> {
    if (!this.bucket) return;
    
    const historyEntry: ContentHistory = {
      id: `${type}/${fileName}/${version}`,
      content_id: `${type}/${fileName}`,
      version,
      timestamp: new Date(),
      user,
      action: action as 'create' | 'update' | 'delete' | 'publish',
      changes: `${action} version ${version}`,
      content_snapshot: content
    };
    
    const historyPath = `${GCS_PATHS.history}${type}/${fileName}/${version}.json`;
    const file = this.bucket.file(historyPath);
    await file.save(JSON.stringify(historyEntry, null, 2), {
      metadata: { contentType: 'application/json' }
    });
  }

  private getRepoPath(type: ContentType): string {
    const mapping: Record<ContentType, string> = {
      domain: 'rubrics_data',
      question: 'assessment_data',
      rubric: 'rubrics_data',
      ksa: 'rubrics_data'
    };
    
    const path = mapping[type] || 'rubrics_data';
    return path;
  }
}

// Singleton instance
export const contentService = new ContentService();