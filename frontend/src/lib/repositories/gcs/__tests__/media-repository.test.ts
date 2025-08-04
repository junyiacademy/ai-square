/**
 * GCS Media Repository Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { GCSMediaRepository } from '../media-repository';
import { Storage, Bucket, File } from '@google-cloud/storage';
import type { MediaFile } from '../../interfaces';

// Mock @google-cloud/storage
jest.mock('@google-cloud/storage');

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation()
};

describe('GCSMediaRepository', () => {
  let repository: GCSMediaRepository;
  let mockStorage: jest.Mocked<Storage>;
  let mockBucket: jest.Mocked<Bucket>;
  let mockFile: jest.Mocked<File>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock file
    mockFile = {
      createWriteStream: jest.fn(),
      makePublic: jest.fn(),
      exists: jest.fn(),
      getMetadata: jest.fn(),
      getSignedUrl: jest.fn(),
      delete: jest.fn(),
      copy: jest.fn(),
      download: jest.fn(),
      setMetadata: jest.fn(),
      name: 'test-file.jpg'
    } as unknown as jest.Mocked<File>;

    // Create mock bucket
    mockBucket = {
      file: jest.fn(() => mockFile),
      getFiles: jest.fn()
    } as unknown as jest.Mocked<Bucket>;

    // Create mock storage
    mockStorage = {
      bucket: jest.fn(() => mockBucket)
    } as unknown as jest.Mocked<Storage>;

    // Create repository instance
    repository = new GCSMediaRepository(mockStorage, 'test-bucket');
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
  });

  describe('uploadFile', () => {
    it('should upload file successfully and return public URL', async () => {
      const mockStream = {
        on: jest.fn(),
        end: jest.fn()
      };

      mockFile.createWriteStream.mockReturnValue(mockStream as any);
      (mockFile.makePublic as any).mockResolvedValue([{}]);

      // Simulate successful upload
      mockStream.on.mockImplementation((event, callback) => {
        if (event === 'finish') {
          // Simulate async finish
          setTimeout(() => callback(), 0);
        }
        return mockStream;
      });

      const uploadPromise = repository.uploadFile('images/test.jpg', Buffer.from('test'), 'image/jpeg');
      
      // Trigger stream end
      expect(mockStream.end).toHaveBeenCalledWith(Buffer.from('test'));

      const result = await uploadPromise;

      expect(mockFile.createWriteStream).toHaveBeenCalledWith({
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000'
        },
        resumable: false
      });
      expect(mockFile.makePublic).toHaveBeenCalled();
      expect(result).toBe('https://storage.googleapis.com/test-bucket/images/test.jpg');
    });

    it('should handle upload errors', async () => {
      const mockStream = {
        on: jest.fn(),
        end: jest.fn()
      };

      mockFile.createWriteStream.mockReturnValue(mockStream as any);

      // Simulate error
      mockStream.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Upload failed')), 0);
        }
        return mockStream;
      });

      const uploadPromise = repository.uploadFile('images/test.jpg', Buffer.from('test'), 'image/jpeg');
      
      await expect(uploadPromise).rejects.toThrow('Upload failed');
      expect(consoleSpy.error).toHaveBeenCalledWith('Upload error:', expect.any(Error));
    });

    it('should handle stream creation errors', async () => {
      mockFile.createWriteStream.mockImplementation(() => {
        throw new Error('Stream creation failed');
      });

      await expect(repository.uploadFile('images/test.jpg', Buffer.from('test'), 'image/jpeg'))
        .rejects.toThrow('Stream creation failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error uploading file:', expect.any(Error));
    });
  });

  describe('getFileUrl', () => {
    it('should return public URL for public files', async () => {
        (mockFile.exists as any).mockResolvedValue([true]);
        (mockFile.getMetadata as any).mockResolvedValue([{
        acl: [{ entity: 'allUsers', role: 'READER' }]
      }]);

      const url = await repository.getFileUrl('images/test.jpg');

      expect(url).toBe('https://storage.googleapis.com/test-bucket/images/test.jpg');
    });

    it('should return signed URL for private files', async () => {
      (mockFile.exists as any).mockResolvedValue([true]);
      (mockFile.getMetadata as any).mockResolvedValue([
          { acl: [] }
        ]);
      (mockFile.getSignedUrl as any).mockResolvedValue(['https://signed-url']);

      const url = await repository.getFileUrl('images/test.jpg');

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number)
      });
      expect(url).toBe('https://signed-url');
    });

    it('should throw error for non-existent files', async () => {
      (mockFile.exists as any).mockResolvedValue([false]);

      await expect(repository.getFileUrl('images/test.jpg'))
        .rejects.toThrow('File not found: images/test.jpg');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error getting file URL:', expect.any(Error));
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      (mockFile.delete as any).mockResolvedValue([{}] as any);

      const result = await repository.deleteFile('images/test.jpg');

      expect(mockFile.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on deletion error', async () => {
      (mockFile.delete as any).mockRejectedValue(new Error('Delete failed'));

      const result = await repository.deleteFile('images/test.jpg');

      expect(consoleSpy.error).toHaveBeenCalledWith('Error deleting file:', expect.any(Error));
      expect(result).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list files with metadata', async () => {
      const mockFiles = [
        {
          name: 'images/file1.jpg',
          getMetadata: jest.fn().mockResolvedValue([{
            size: '1024',
            contentType: 'image/jpeg',
            updated: '2024-01-20T10:00:00Z'
          }])
        },
        {
          name: 'images/file2.png',
          getMetadata: jest.fn().mockResolvedValue([{
            size: 2048,
            contentType: 'image/png',
            timeCreated: '2024-01-20T11:00:00Z'
          }])
        }
      ];

        (mockBucket.getFiles as any).mockResolvedValue([mockFiles as any, null, null]);
      
      // Mock getFileUrl for each file
      const getFileUrlSpy = jest.spyOn(repository, 'getFileUrl');
      getFileUrlSpy.mockImplementation(async (path) => `https://storage.googleapis.com/test-bucket/${path}`);

      const result = await repository.listFiles('images/');

      expect((mockBucket.getFiles as any)).toHaveBeenCalledWith({
        prefix: 'images/',
        delimiter: '/'
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'images/file1.jpg',
        url: 'https://storage.googleapis.com/test-bucket/images/file1.jpg',
        size: 1024,
        contentType: 'image/jpeg',
        updatedAt: new Date('2024-01-20T10:00:00Z')
      });
      expect(result[1]).toEqual({
        name: 'images/file2.png',
        url: 'https://storage.googleapis.com/test-bucket/images/file2.png',
        size: 2048,
        contentType: 'image/png',
        updatedAt: new Date('2024-01-20T11:00:00Z')
      });
    });

    it('should handle listing errors', async () => {
      (mockBucket.getFiles as any).mockRejectedValue(new Error('List failed'));

      await expect(repository.listFiles('images/'))
        .rejects.toThrow('List failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error listing files:', expect.any(Error));
    });

    it('should handle files with missing metadata', async () => {
      const mockFiles = [
        {
          name: 'images/file1.jpg',
          getMetadata: jest.fn().mockResolvedValue([{}])
        }
      ];

      (mockBucket.getFiles as any).mockResolvedValue([mockFiles as any, null, null]);
      
      const getFileUrlSpy = jest.spyOn(repository, 'getFileUrl');
      getFileUrlSpy.mockResolvedValue('https://storage.googleapis.com/test-bucket/images/file1.jpg');

      const result = await repository.listFiles('images/');

      expect(result[0]).toEqual({
        name: 'images/file1.jpg',
        url: 'https://storage.googleapis.com/test-bucket/images/file1.jpg',
        size: 0,
        contentType: 'application/octet-stream',
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('uploadImage', () => {
    it('should upload image without thumbnail', async () => {
      const uploadFileSpy = jest.spyOn(repository, 'uploadFile');
      uploadFileSpy.mockResolvedValue('https://storage.googleapis.com/test-bucket/images/test.jpg');

      const result = await repository.uploadImage('images/test.jpg', Buffer.from('test'));

      expect(uploadFileSpy).toHaveBeenCalledWith('images/test.jpg', Buffer.from('test'), 'image/jpeg');
      expect(result).toEqual({
        url: 'https://storage.googleapis.com/test-bucket/images/test.jpg'
      });
    });

    it('should upload image with thumbnail', async () => {
      const uploadFileSpy = jest.spyOn(repository, 'uploadFile');
      uploadFileSpy
        .mockResolvedValueOnce('https://storage.googleapis.com/test-bucket/images/test.jpg')
        .mockResolvedValueOnce('https://storage.googleapis.com/test-bucket/images/test_thumb.jpg');

      const result = await repository.uploadImage(
        'images/test.jpg', 
        Buffer.from('test'),
        { generateThumbnail: true }
      );

      expect(uploadFileSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        url: 'https://storage.googleapis.com/test-bucket/images/test.jpg',
        thumbnailUrl: 'https://storage.googleapis.com/test-bucket/images/test_thumb.jpg'
      });
    });
  });

  describe('getUploadUrl', () => {
    it('should generate pre-signed upload URL', async () => {
      (mockFile.getSignedUrl as any).mockResolvedValue(['https://signed-upload-url']);

      const result = await repository.getUploadUrl('images/test.jpg', 'image/jpeg', 60);

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'write',
        expires: expect.any(Number),
        contentType: 'image/jpeg'
      });
      expect(result).toEqual({
        uploadUrl: 'https://signed-upload-url',
        publicUrl: 'https://storage.googleapis.com/test-bucket/images/test.jpg'
      });
    });

    it('should use default expiry time', async () => {
      (mockFile.getSignedUrl as any).mockResolvedValue(['https://signed-upload-url']);

      await repository.getUploadUrl('images/test.jpg', 'image/jpeg');

      const call = (mockFile.getSignedUrl.mock.calls[0][0] as any);
      const expiryTime = (call.expires as number) - Date.now();
      
      // Should be approximately 30 minutes
      expect(expiryTime).toBeGreaterThan(29 * 60 * 1000);
      expect(expiryTime).toBeLessThan(31 * 60 * 1000);
    });
  });

  describe('copyFile', () => {
      it('should copy file successfully', async () => {
        (mockFile.copy as any).mockResolvedValue([{} as any, {}]);
      const getFileUrlSpy = jest.spyOn(repository, 'getFileUrl');
      getFileUrlSpy.mockResolvedValue('https://storage.googleapis.com/test-bucket/images/copy.jpg');

      const result = await repository.copyFile('images/original.jpg', 'images/copy.jpg');

      expect(mockBucket.file).toHaveBeenCalledWith('images/original.jpg');
      expect(mockBucket.file).toHaveBeenCalledWith('images/copy.jpg');
      expect(mockFile.copy).toHaveBeenCalled();
      expect(result).toBe('https://storage.googleapis.com/test-bucket/images/copy.jpg');
    });

    it('should handle copy errors', async () => {
      (mockFile.copy as any).mockRejectedValue(new Error('Copy failed'));

      await expect(repository.copyFile('images/original.jpg', 'images/copy.jpg'))
        .rejects.toThrow('Copy failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error copying file:', expect.any(Error));
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      const copyFileSpy = jest.spyOn(repository, 'copyFile');
      const deleteFileSpy = jest.spyOn(repository, 'deleteFile');
      
      copyFileSpy.mockResolvedValue('https://new-url');
      deleteFileSpy.mockResolvedValue(true);

      const result = await repository.moveFile('images/old.jpg', 'images/new.jpg');

      expect(copyFileSpy).toHaveBeenCalledWith('images/old.jpg', 'images/new.jpg');
      expect(deleteFileSpy).toHaveBeenCalledWith('images/old.jpg');
      expect(result).toBe('https://new-url');
    });
  });

  describe('exists', () => {
    it('should return true for existing files', async () => {
      (mockFile.exists as any).mockResolvedValue([true]);

      const result = await repository.exists('images/test.jpg');

      expect(result).toBe(true);
    });

    it('should return false for non-existent files', async () => {
      (mockFile.exists as any).mockResolvedValue([false]);

      const result = await repository.exists('images/test.jpg');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (mockFile.exists as any).mockRejectedValue(new Error('Check failed'));

      const result = await repository.exists('images/test.jpg');

      expect(consoleSpy.error).toHaveBeenCalledWith('Error checking file existence:', expect.any(Error));
      expect(result).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should get file metadata successfully', async () => {
      const mockMetadata = {
        size: 1024,
        contentType: 'image/jpeg',
        updated: '2024-01-20T10:00:00Z'
      };
      (mockFile.getMetadata as any).mockResolvedValue([mockMetadata]);

      const result = await repository.getMetadata('images/test.jpg');

      expect(result).toEqual(mockMetadata);
    });

    it('should handle metadata errors', async () => {
      (mockFile.getMetadata as any).mockRejectedValue(new Error('Metadata failed'));

      await expect(repository.getMetadata('images/test.jpg'))
        .rejects.toThrow('Metadata failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error getting file metadata:', expect.any(Error));
    });
  });

  describe('setMetadata', () => {
    it('should set custom metadata successfully', async () => {
      (mockFile.setMetadata as any).mockResolvedValue([{}] as any);

      await repository.setMetadata('images/test.jpg', { author: 'John Doe' });

      expect(mockFile.setMetadata).toHaveBeenCalledWith({
        metadata: { author: 'John Doe' }
      });
    });

    it('should handle set metadata errors', async () => {
      (mockFile.setMetadata as any).mockRejectedValue(new Error('Set metadata failed'));

      await expect(repository.setMetadata('images/test.jpg', { author: 'John Doe' }))
        .rejects.toThrow('Set metadata failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error setting file metadata:', expect.any(Error));
    });
  });

  describe('downloadFile', () => {
    it('should download file content successfully', async () => {
      const mockContent = Buffer.from('file content');
      (mockFile.download as any).mockResolvedValue([mockContent]);

      const result = await repository.downloadFile('images/test.jpg');

      expect(result).toEqual(mockContent);
    });

    it('should handle download errors', async () => {
      (mockFile.download as any).mockRejectedValue(new Error('Download failed'));

      await expect(repository.downloadFile('images/test.jpg'))
        .rejects.toThrow('Download failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error downloading file:', expect.any(Error));
    });
  });

  describe('isPublic (private method)', () => {
    it('should identify public files correctly', async () => {
      // Test through getFileUrl which uses isPublic
        (mockFile.exists as any).mockResolvedValue([true]);
        (mockFile.getMetadata as any).mockResolvedValue([{
        acl: [
          { entity: 'user-123', role: 'OWNER' },
          { entity: 'allUsers', role: 'READER' }
        ]
      }]);

      const url = await repository.getFileUrl('images/test.jpg');

      // Should return public URL, not signed URL
      expect(url).toBe('https://storage.googleapis.com/test-bucket/images/test.jpg');
      expect(mockFile.getSignedUrl).not.toHaveBeenCalled();
    });

    it('should handle missing ACL', async () => {
        (mockFile.exists as any).mockResolvedValue([true]);
        (mockFile.getMetadata as any).mockResolvedValue([{}]); // No ACL
        (mockFile.getSignedUrl as any).mockResolvedValue(['https://signed-url']);

      const url = await repository.getFileUrl('images/test.jpg');

      // Should generate signed URL for private file
      expect(mockFile.getSignedUrl).toHaveBeenCalled();
      expect(url).toBe('https://signed-url');
    });
  });
});