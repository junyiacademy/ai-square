import { LocalStorageService } from './local-storage-service';

export class StorageFactory {
  static create(type: 'local' | 'gcs' = 'local') {
    // For now, only implement local storage
    // GCS can be added later when needed
    return new LocalStorageService();
  }
}