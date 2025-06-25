import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { ContentItem, ContentType, ContentHistory } from '@/types/cms';

// GCS paths structure
const GCS_PATHS = {
  overrides: 'cms/overrides/',      // Active overrides
  drafts: 'cms/drafts/',           // Work in progress
  history: 'cms/history/',         // Version history
  metadata: 'cms/metadata/'        // Content metadata
};

export class ContentService {
  private storage?: Storage;
  private bucket?: any;
  private isProduction: boolean;
  
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    if (process.env.GCS_BUCKET_NAME) {
      this.storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
      });
      this.bucket = this.storage.bucket(process.env.GCS_BUCKET_NAME);
    }
  }

  // Get content with GCS override check
  async getContent(type: ContentType, fileName: string): Promise<any> {
    // 1. Read base content from repo
    const baseContent = await this.readFromRepo(type, fileName);
    
    // 2. Check for GCS override
    if (this.bucket) {
      const override = await this.readFromGCS(`${GCS_PATHS.overrides}${type}/${fileName}`);
      if (override) {
        return { ...baseContent, ...override, _source: 'gcs_override' };
      }
    }
    
    return { ...baseContent, _source: 'repo' };
  }

  // List all content items
  async listContent(type: ContentType): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    
    // 1. List from repo
    const repoPath = path.join(process.cwd(), 'public', this.getRepoPath(type));
    try {
      const files = await fs.readdir(repoPath);
      
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const content = await this.readFromRepo(type, file);
          const metadata = await this.getMetadata(type, file);
          
          items.push({
            id: `${type}/${file}`,
            type,
            status: metadata?.status || 'published',
            version: metadata?.version || 1,
            created_at: metadata?.created_at || new Date(),
            updated_at: metadata?.updated_at || new Date(),
            created_by: metadata?.created_by || 'system',
            updated_by: metadata?.updated_by || 'system',
            title: content.title || file,
            description: content.description,
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
            title: content.title || fileName,
            description: content.description,
            content,
            file_path: `${type}/${fileName}`,
            gcs_path: file.name
          });
        }
      }
    }
    
    return items;
  }

  // Save content to GCS
  async saveContent(
    type: ContentType, 
    fileName: string, 
    content: any, 
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
    await this.bucket.file(filePath).save(yamlContent, {
      metadata: {
        contentType: 'application/x-yaml',
      },
    });
    
    // Update metadata
    const metadata = await this.getMetadata(type, fileName) || {
      created_at: new Date(),
      created_by: user,
      version: 0
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
    } catch (error) {
      // Ignore if not exists
    }
    
    try {
      await this.bucket.file(draftPath).delete();
    } catch (error) {
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
    const [draftFile] = await this.bucket.file(draftPath).get();
    await this.bucket.file(overridePath).save(await draftFile.download(), {
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
  private async readFromRepo(type: ContentType, fileName: string): Promise<any> {
    const filePath = path.join(process.cwd(), 'public', this.getRepoPath(type), fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return yaml.load(content);
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return null;
    }
  }

  private async readFromGCS(filePath: string): Promise<any> {
    if (!this.bucket) return null;
    
    try {
      const [file] = await this.bucket.file(filePath).download();
      return yaml.load(file.toString());
    } catch (error) {
      return null;
    }
  }

  private async getMetadata(type: ContentType, fileName: string): Promise<any> {
    if (!this.bucket) return null;
    
    const metadataPath = `${GCS_PATHS.metadata}${type}/${fileName}.json`;
    
    try {
      const [file] = await this.bucket.file(metadataPath).download();
      return JSON.parse(file.toString());
    } catch (error) {
      return null;
    }
  }

  private async saveMetadata(type: ContentType, fileName: string, metadata: any): Promise<void> {
    if (!this.bucket) return;
    
    const metadataPath = `${GCS_PATHS.metadata}${type}/${fileName}.json`;
    await this.bucket.file(metadataPath).save(JSON.stringify(metadata, null, 2));
  }

  private async saveHistory(
    type: ContentType, 
    fileName: string, 
    content: any, 
    version: number,
    user: string,
    action: string
  ): Promise<void> {
    if (!this.bucket) return;
    
    const timestamp = new Date().toISOString();
    const historyPath = `${GCS_PATHS.history}${type}/${fileName}/${timestamp}.json`;
    
    const historyEntry: ContentHistory = {
      id: `${type}/${fileName}/${timestamp}`,
      content_id: `${type}/${fileName}`,
      version,
      timestamp: new Date(timestamp),
      user,
      action: action as any,
      changes: `${action} by ${user}`,
      content_snapshot: content
    };
    
    await this.bucket.file(historyPath).save(JSON.stringify(historyEntry, null, 2));
  }

  private getRepoPath(type: ContentType): string {
    switch (type) {
      case 'domain':
        return 'rubrics_data';
      case 'question':
        return 'assessment_data';
      case 'ksa':
        return 'rubrics_data';
      default:
        return 'rubrics_data';
    }
  }
}

// Singleton instance
export const contentService = new ContentService();