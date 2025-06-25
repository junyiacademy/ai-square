// CMS Type Definitions

export type ContentType = 'domain' | 'question' | 'rubric' | 'ksa';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface ContentItem {
  id: string;
  type: ContentType;
  status: ContentStatus;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  title: string;
  description?: string;
  content: any; // YAML content as object
  file_path: string; // Original file path in repo
  gcs_path?: string; // GCS override path if exists
}

export interface ContentHistory {
  id: string;
  content_id: string;
  version: number;
  timestamp: Date;
  user: string;
  action: 'create' | 'update' | 'delete' | 'publish';
  changes: string;
  content_snapshot: any;
}

export interface ContentFilter {
  type?: ContentType;
  status?: ContentStatus;
  search?: string;
  language?: string;
}

export interface ContentService {
  list(filter?: ContentFilter): Promise<ContentItem[]>;
  get(id: string): Promise<ContentItem | null>;
  create(item: Omit<ContentItem, 'id' | 'version' | 'created_at' | 'updated_at'>): Promise<ContentItem>;
  update(id: string, updates: Partial<ContentItem>): Promise<ContentItem>;
  delete(id: string): Promise<void>;
  getHistory(id: string): Promise<ContentHistory[]>;
  publish(id: string): Promise<void>;
  createPullRequest(id: string, message: string): Promise<{ url: string }>;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: string[];
}

export interface CMSConfig {
  githubToken?: string;
  autoCreatePR: boolean;
  requireApproval: boolean;
  allowedEditors: string[];
}