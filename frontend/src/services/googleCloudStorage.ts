import { Storage } from '@google-cloud/storage';

// Initialize GCS client
const storageConfig: {
  projectId?: string;
  keyFilename?: string;
} = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
};

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const storage = new Storage(storageConfig);
const bucketName = process.env.GCS_BUCKET_NAME || 'ai-square-db';
const bucket = storage.bucket(bucketName);

export const googleCloudStorageService = {
  async saveFile(path: string, content: string): Promise<void> {
    const file = bucket.file(path);
    await file.save(content, {
      metadata: {
        contentType: 'application/json',
      },
    });
  },

  async readFile(path: string): Promise<string> {
    const file = bucket.file(path);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new Error(`File not found: ${path}`);
    }
    
    const [contents] = await file.download();
    return contents.toString();
  },

  async fileExists(path: string): Promise<boolean> {
    const file = bucket.file(path);
    const [exists] = await file.exists();
    return exists;
  },

  async listFiles(prefix: string): Promise<string[]> {
    const [files] = await bucket.getFiles({ prefix });
    return files.map(file => file.name);
  },

  async deleteFile(path: string): Promise<void> {
    const file = bucket.file(path);
    await file.delete();
  }
};