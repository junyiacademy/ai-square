/**
 * GCS Media Repository
 * 處理所有媒體檔案（圖片、影片、文件等）
 */

import { Storage, Bucket } from '@google-cloud/storage';
import { IMediaRepository, MediaFile } from '../interfaces';

export class GCSMediaRepository implements IMediaRepository {
  private bucket: Bucket;

  constructor(
    private storage: Storage,
    private bucketName: string
  ) {
    this.bucket = storage.bucket(bucketName);
  }

  async uploadFile(path: string, file: Buffer, contentType: string): Promise<string> {
    try {
      const blob = this.bucket.file(path);
      const stream = blob.createWriteStream({
        metadata: {
          contentType,
          cacheControl: 'public, max-age=31536000', // 1 year cache
        },
        resumable: false
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('Upload error:', error);
          reject(error);
        });

        stream.on('finish', async () => {
          // Make file public
          await blob.makePublic();
          
          // Return public URL
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${path}`;
          resolve(publicUrl);
        });

        stream.end(file);
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async getFileUrl(path: string): Promise<string> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new Error(`File not found: ${path}`);
      }

      // Check if file is public
      const [metadata] = await file.getMetadata();
      
      if (this.isPublic(metadata)) {
        // Return public URL
        return `https://storage.googleapis.com/${this.bucketName}/${path}`;
      } else {
        // Generate signed URL for private files
        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 3600 * 1000, // 1 hour
        });
        
        return signedUrl;
      }
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const file = this.bucket.file(path);
      await file.delete();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async listFiles(prefix: string): Promise<MediaFile[]> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix,
        delimiter: '/'
      });

      const mediaFiles: MediaFile[] = [];

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        
        mediaFiles.push({
          name: file.name,
          url: await this.getFileUrl(file.name),
          size: parseInt(metadata.size || '0'),
          contentType: metadata.contentType || 'application/octet-stream',
          updatedAt: new Date(metadata.updated || metadata.timeCreated)
        });
      }

      return mediaFiles;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Utility methods

  /**
   * Upload image with automatic resizing options
   */
  async uploadImage(
    path: string, 
    file: Buffer, 
    options?: {
      generateThumbnail?: boolean;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    // Upload original
    const url = await this.uploadFile(path, file, 'image/jpeg');
    
    const result: { url: string; thumbnailUrl?: string } = { url };

    // Generate thumbnail if requested
    if (options?.generateThumbnail) {
      // This would require image processing library like sharp
      // For now, we'll use the same image
      const thumbnailPath = path.replace(/\.(jpg|jpeg|png)$/i, '_thumb.$1');
      result.thumbnailUrl = await this.uploadFile(thumbnailPath, file, 'image/jpeg');
    }

    return result;
  }

  /**
   * Get pre-signed upload URL for client-side uploads
   */
  async getUploadUrl(
    path: string, 
    contentType: string,
    expiresInMinutes: number = 30
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const file = this.bucket.file(path);
    
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
      contentType,
    });

    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${path}`;

    return { uploadUrl, publicUrl };
  }

  /**
   * Copy file within bucket
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<string> {
    try {
      const sourceFile = this.bucket.file(sourcePath);
      const destinationFile = this.bucket.file(destinationPath);
      
      await sourceFile.copy(destinationFile);
      
      return this.getFileUrl(destinationPath);
    } catch (error) {
      console.error('Error copying file:', error);
      throw error;
    }
  }

  /**
   * Move file (copy + delete)
   */
  async moveFile(sourcePath: string, destinationPath: string): Promise<string> {
    const newUrl = await this.copyFile(sourcePath, destinationPath);
    await this.deleteFile(sourcePath);
    return newUrl;
  }

  /**
   * Check if file exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<any> {
    try {
      const file = this.bucket.file(path);
      const [metadata] = await file.getMetadata();
      return metadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Set custom metadata
   */
  async setMetadata(path: string, metadata: Record<string, string>): Promise<void> {
    try {
      const file = this.bucket.file(path);
      await file.setMetadata({ metadata });
    } catch (error) {
      console.error('Error setting file metadata:', error);
      throw error;
    }
  }

  /**
   * Download file content
   */
  async downloadFile(path: string): Promise<Buffer> {
    try {
      const file = this.bucket.file(path);
      const [content] = await file.download();
      return content;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  private isPublic(metadata: any): boolean {
    // Check if file has public ACL
    return metadata.acl?.some((acl: any) => 
      acl.entity === 'allUsers' && acl.role === 'READER'
    ) || false;
  }
}