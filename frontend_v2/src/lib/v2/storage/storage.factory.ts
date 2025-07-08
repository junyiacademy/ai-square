/**
 * Storage Factory for V2
 * Creates appropriate storage service based on environment
 */

import { IStorageService } from '@/lib/v2/abstractions/storage.interface';
import { GCSStorageService } from './gcs-storage.service';
import { LocalStorageService } from './local-storage.service';

export class StorageFactory {
  private static instance: IStorageService | null = null;
  private static initPromise: Promise<void> | null = null;

  /**
   * Get storage service instance with automatic fallback
   */
  static async getStorage(): Promise<IStorageService> {
    if (this.instance) {
      return this.instance;
    }

    // Always use GCS for both server and client
    this.instance = new GCSStorageService();

    // Initialize only once
    if (!this.initPromise) {
      this.initPromise = this.instance.initialize().catch(error => {
        console.error('Storage initialization failed:', error);
        throw error;
      });
    }

    await this.initPromise;
    return this.instance;
  }

  /**
   * Reset storage instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.initPromise = null;
  }

  /**
   * Create storage service with specific type
   */
  static create(type: 'gcs' | 'local'): IStorageService {
    switch (type) {
      case 'gcs':
        return new GCSStorageService();
      case 'local':
        return new LocalStorageService();
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }
}