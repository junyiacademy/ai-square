/**
 * V2 Storage Service
 * Handles file storage operations with Google Cloud Storage
 */

import { StorageObject } from '../types';

export interface IStorageService {
  // File operations
  upload(file: File, path: string): Promise<StorageObject>;
  uploadMany(files: { file: File; path: string }[]): Promise<StorageObject[]>;
  download(path: string): Promise<Blob>;
  delete(path: string): Promise<boolean>;
  deleteMany(paths: string[]): Promise<number>;
  
  // File information
  exists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<StorageObject | null>;
  getSignedUrl(path: string, expiresInMinutes?: number): Promise<string>;
  
  // Directory operations
  list(prefix: string): Promise<StorageObject[]>;
  createFolder(path: string): Promise<boolean>;
  deleteFolder(path: string): Promise<boolean>;
}

export class StorageService implements IStorageService {
  private readonly bucketName: string;
  private readonly apiBaseUrl: string;

  constructor(bucketName: string = 'ai-square-db-v2', apiBaseUrl: string = '/api/v2') {
    this.bucketName = bucketName;
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Upload a file to storage
   */
  async upload(file: File, path: string): Promise<StorageObject> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('bucket', this.bucketName);

    const response = await fetch(`${this.apiBaseUrl}/storage/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Upload multiple files
   */
  async uploadMany(files: { file: File; path: string }[]): Promise<StorageObject[]> {
    const uploadPromises = files.map(({ file, path }) => this.upload(file, path));
    return Promise.all(uploadPromises);
  }

  /**
   * Download a file from storage
   */
  async download(path: string): Promise<Blob> {
    const response = await fetch(`${this.apiBaseUrl}/storage/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: this.bucketName,
        path,
      }),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Delete a file from storage
   */
  async delete(path: string): Promise<boolean> {
    const response = await fetch(`${this.apiBaseUrl}/storage/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: this.bucketName,
        path,
      }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data.deleted;
  }

  /**
   * Delete multiple files
   */
  async deleteMany(paths: string[]): Promise<number> {
    const response = await fetch(`${this.apiBaseUrl}/storage/delete-many`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: this.bucketName,
        paths,
      }),
    });

    if (!response.ok) {
      throw new Error(`Delete many failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data.deleted;
  }

  /**
   * Check if a file exists
   */
  async exists(path: string): Promise<boolean> {
    const response = await fetch(`${this.apiBaseUrl}/storage/exists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: this.bucketName,
        path,
      }),
    });

    if (!response.ok) {
      throw new Error(`Exists check failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data.exists;
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<StorageObject | null> {
    const response = await fetch(`${this.apiBaseUrl}/storage/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: this.bucketName,
        path,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Get metadata failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(path: string, expiresInMinutes: number = 60): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/storage/signed-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: this.bucketName,
        path,
        expiresInMinutes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Get signed URL failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data.url;
  }

  /**
   * List files with a prefix
   */
  async list(prefix: string): Promise<StorageObject[]> {
    const response = await fetch(`${this.apiBaseUrl}/storage/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: this.bucketName,
        prefix,
      }),
    });

    if (!response.ok) {
      throw new Error(`List failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Create a folder (by creating a placeholder file)
   */
  async createFolder(path: string): Promise<boolean> {
    const folderPath = path.endsWith('/') ? path : `${path}/`;
    const placeholderPath = `${folderPath}.placeholder`;
    
    try {
      const placeholderFile = new File([''], '.placeholder', { type: 'text/plain' });
      await this.upload(placeholderFile, placeholderPath);
      return true;
    } catch (error) {
      console.error('Create folder error:', error);
      return false;
    }
  }

  /**
   * Delete a folder and all its contents
   */
  async deleteFolder(path: string): Promise<boolean> {
    const folderPath = path.endsWith('/') ? path : `${path}/`;
    
    try {
      // List all files in the folder
      const files = await this.list(folderPath);
      
      if (files.length === 0) {
        return true;
      }
      
      // Delete all files
      const paths = files.map(file => file.path);
      const deletedCount = await this.deleteMany(paths);
      
      return deletedCount === files.length;
    } catch (error) {
      console.error('Delete folder error:', error);
      return false;
    }
  }

  /**
   * Helper method to build storage paths
   */
  static buildPath(...segments: string[]): string {
    return segments.filter(Boolean).join('/');
  }

  /**
   * Helper method to extract filename from path
   */
  static getFilename(path: string): string {
    return path.split('/').pop() || '';
  }

  /**
   * Helper method to extract directory from path
   */
  static getDirectory(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  }
}