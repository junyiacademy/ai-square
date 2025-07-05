/**
 * Storage 相關錯誤定義
 */

export class StorageError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message);
    this.name = 'StorageError';
    // 保持原型鏈
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

export class StorageNotFoundError extends StorageError {
  constructor(key: string) {
    super(`Item not found: ${key}`, 'STORAGE_NOT_FOUND');
    Object.setPrototypeOf(this, StorageNotFoundError.prototype);
  }
}

export class StorageQuotaExceededError extends StorageError {
  constructor(message: string = 'Storage quota exceeded') {
    super(message, 'STORAGE_QUOTA_EXCEEDED');
    Object.setPrototypeOf(this, StorageQuotaExceededError.prototype);
  }
}

export class StorageConnectionError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_CONNECTION_ERROR', cause);
    Object.setPrototypeOf(this, StorageConnectionError.prototype);
  }
}

export class StoragePermissionError extends StorageError {
  constructor(message: string) {
    super(message, 'STORAGE_PERMISSION_ERROR');
    Object.setPrototypeOf(this, StoragePermissionError.prototype);
  }
}

export class StorageValidationError extends StorageError {
  constructor(message: string) {
    super(message, 'STORAGE_VALIDATION_ERROR');
    Object.setPrototypeOf(this, StorageValidationError.prototype);
  }
}