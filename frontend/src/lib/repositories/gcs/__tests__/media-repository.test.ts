/**
 * Tests for GCSMediaRepository
 * Comprehensive coverage for all media file operations
 */

import { Storage, Bucket } from "@google-cloud/storage";
import { GCSMediaRepository } from "../media-repository";
import { MediaFile } from "../../interfaces";

// Mock Google Cloud Storage
jest.mock("@google-cloud/storage");

describe("GCSMediaRepository", () => {
  let repository: GCSMediaRepository;
  let mockStorage: any;
  let mockBucket: any;
  let mockFile: any;
  let mockStream: any;

  beforeEach(() => {
    mockStream = {
      on: jest.fn((event, callback) => {
        if (event === "finish") {
          // Simulate successful upload
          setTimeout(() => callback(), 0);
        }
        return mockStream;
      }),
      end: jest.fn(),
      createWriteStream: jest.fn(),
    };

    mockFile = {
      createWriteStream: jest.fn(() => mockStream),
      makePublic: jest.fn().mockResolvedValue([]),
      exists: jest.fn().mockResolvedValue([true]),
      getMetadata: jest.fn().mockResolvedValue([
        {
          size: "1024",
          contentType: "image/jpeg",
          updated: "2024-01-01T00:00:00.000Z",
          acl: [{ entity: "allUsers", role: "READER" }],
        },
      ]),
      delete: jest.fn().mockResolvedValue([]),
      copy: jest.fn().mockResolvedValue([]),
      getSignedUrl: jest.fn().mockResolvedValue(["https://signed-url.com"]),
      setMetadata: jest.fn().mockResolvedValue([]),
      download: jest.fn().mockResolvedValue([Buffer.from("file content")]),
      name: "test-file.jpg",
    };

    mockBucket = {
      file: jest.fn(() => mockFile),
      getFiles: jest.fn().mockResolvedValue([[mockFile]]),
    };

    mockStorage = {
      bucket: jest.fn(() => mockBucket),
    } as any;

    repository = new GCSMediaRepository(mockStorage, "test-bucket");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with storage and bucket name", () => {
      expect(mockStorage.bucket).toHaveBeenCalledWith("test-bucket");
    });
  });

  describe("uploadFile", () => {
    it("should upload file successfully", async () => {
      const fileBuffer = Buffer.from("test file content");
      const result = await repository.uploadFile(
        "images/test.jpg",
        fileBuffer,
        "image/jpeg",
      );

      expect(mockBucket.file).toHaveBeenCalledWith("images/test.jpg");
      expect(mockFile.createWriteStream).toHaveBeenCalledWith({
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        },
        resumable: false,
      });
      expect(mockFile.makePublic).toHaveBeenCalled();
      expect(result).toBe(
        "https://storage.googleapis.com/test-bucket/images/test.jpg",
      );
    });

    it("should handle upload errors", async () => {
      mockStream.on.mockImplementation(
        (event: string, callback: (error?: Error) => void) => {
          if (event === "error") {
            setTimeout(() => callback(new Error("Upload failed")), 0);
          }
          return mockStream;
        },
      );

      const fileBuffer = Buffer.from("test file content");

      await expect(
        repository.uploadFile("images/test.jpg", fileBuffer, "image/jpeg"),
      ).rejects.toThrow("Upload failed");
    });

    it("should handle stream creation errors", async () => {
      mockFile.createWriteStream.mockImplementation(() => {
        throw new Error("Stream creation failed");
      });

      const fileBuffer = Buffer.from("test file content");

      await expect(
        repository.uploadFile("images/test.jpg", fileBuffer, "image/jpeg"),
      ).rejects.toThrow("Stream creation failed");
    });
  });

  describe("getFileUrl", () => {
    it("should return public URL for public files", async () => {
      const result = await repository.getFileUrl("images/test.jpg");

      expect(mockFile.exists).toHaveBeenCalled();
      expect(mockFile.getMetadata).toHaveBeenCalled();
      expect(result).toBe(
        "https://storage.googleapis.com/test-bucket/images/test.jpg",
      );
    });

    it("should return signed URL for private files", async () => {
      mockFile.getMetadata.mockResolvedValueOnce([
        {
          size: "1024",
          contentType: "image/jpeg",
          updated: "2024-01-01T00:00:00.000Z",
          acl: [], // No public access
        },
      ]);

      const result = await repository.getFileUrl("images/private.jpg");

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: "v4",
        action: "read",
        expires: expect.any(Number),
      });
      expect(result).toBe("https://signed-url.com");
    });

    it("should throw error for non-existent files", async () => {
      mockFile.exists.mockResolvedValueOnce([false]);

      await expect(
        repository.getFileUrl("images/nonexistent.jpg"),
      ).rejects.toThrow("File not found: images/nonexistent.jpg");
    });

    it("should handle metadata errors", async () => {
      mockFile.getMetadata.mockRejectedValueOnce(new Error("Metadata error"));

      await expect(repository.getFileUrl("images/test.jpg")).rejects.toThrow(
        "Metadata error",
      );
    });
  });

  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      const result = await repository.deleteFile("images/test.jpg");

      expect(mockFile.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false on delete error", async () => {
      mockFile.delete.mockRejectedValueOnce(new Error("Delete failed"));

      const result = await repository.deleteFile("images/test.jpg");

      expect(result).toBe(false);
    });
  });

  describe("listFiles", () => {
    it("should list files with metadata", async () => {
      const result = await repository.listFiles("images/");

      expect(mockBucket.getFiles).toHaveBeenCalledWith({
        prefix: "images/",
        delimiter: "/",
      });

      expect(result).toEqual([
        {
          name: "test-file.jpg",
          url: "https://storage.googleapis.com/test-bucket/test-file.jpg",
          size: 1024,
          contentType: "image/jpeg",
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ]);
    });

    it("should handle numeric size metadata", async () => {
      mockFile.getMetadata.mockResolvedValueOnce([
        {
          size: 2048, // Number instead of string
          contentType: "image/png",
          updated: "2024-01-02T00:00:00.000Z",
        },
      ]);

      const result = await repository.listFiles("images/");

      expect(result[0].size).toBe(2048);
    });

    it("should handle missing metadata", async () => {
      mockFile.getMetadata.mockResolvedValueOnce([
        {
          // Missing size, contentType, updated
          timeCreated: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await repository.listFiles("images/");

      expect(result[0]).toEqual({
        name: "test-file.jpg",
        url: "https://storage.googleapis.com/test-bucket/test-file.jpg",
        size: 0,
        contentType: "application/octet-stream",
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      });
    });

    it("should handle listing errors", async () => {
      mockBucket.getFiles.mockRejectedValueOnce(new Error("Listing failed"));

      await expect(repository.listFiles("images/")).rejects.toThrow(
        "Listing failed",
      );
    });
  });

  describe("uploadImage", () => {
    it("should upload image without thumbnail", async () => {
      const imageBuffer = Buffer.from("image content");
      const result = await repository.uploadImage(
        "images/photo.jpg",
        imageBuffer,
      );

      expect(result).toEqual({
        url: "https://storage.googleapis.com/test-bucket/images/photo.jpg",
      });
    });

    it("should upload image with thumbnail", async () => {
      const imageBuffer = Buffer.from("image content");
      const result = await repository.uploadImage(
        "images/photo.jpg",
        imageBuffer,
        {
          generateThumbnail: true,
        },
      );

      expect(result).toEqual({
        url: "https://storage.googleapis.com/test-bucket/images/photo.jpg",
        thumbnailUrl:
          "https://storage.googleapis.com/test-bucket/images/photo_thumb.jpg",
      });
    });

    it("should handle different image extensions for thumbnails", async () => {
      const imageBuffer = Buffer.from("image content");
      const result = await repository.uploadImage(
        "images/photo.PNG",
        imageBuffer,
        {
          generateThumbnail: true,
        },
      );

      expect(result.thumbnailUrl).toBe(
        "https://storage.googleapis.com/test-bucket/images/photo_thumb.PNG",
      );
    });
  });

  describe("getUploadUrl", () => {
    it("should generate upload URL with default expiration", async () => {
      const result = await repository.getUploadUrl(
        "images/upload.jpg",
        "image/jpeg",
      );

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: "v4",
        action: "write",
        expires: expect.any(Number),
        contentType: "image/jpeg",
      });

      expect(result).toEqual({
        uploadUrl: "https://signed-url.com",
        publicUrl:
          "https://storage.googleapis.com/test-bucket/images/upload.jpg",
      });
    });

    it("should generate upload URL with custom expiration", async () => {
      await repository.getUploadUrl("images/upload.jpg", "image/jpeg", 60);

      const callArgs = mockFile.getSignedUrl.mock.calls[0][0];
      const expectedExpires = Date.now() + 60 * 60 * 1000;

      expect(callArgs.expires).toBeGreaterThanOrEqual(expectedExpires - 1000);
      expect(callArgs.expires).toBeLessThanOrEqual(expectedExpires + 1000);
    });
  });

  describe("copyFile", () => {
    it("should copy file successfully", async () => {
      const destinationFile = { ...mockFile };
      mockBucket.file.mockImplementation((path: string) => {
        if (path === "destination/file.jpg") return destinationFile;
        return mockFile;
      });

      const result = await repository.copyFile(
        "source/file.jpg",
        "destination/file.jpg",
      );

      expect(mockFile.copy).toHaveBeenCalledWith(destinationFile);
      expect(result).toBe(
        "https://storage.googleapis.com/test-bucket/destination/file.jpg",
      );
    });

    it("should handle copy errors", async () => {
      mockFile.copy.mockRejectedValueOnce(new Error("Copy failed"));

      await expect(
        repository.copyFile("source/file.jpg", "destination/file.jpg"),
      ).rejects.toThrow("Copy failed");
    });
  });

  describe("moveFile", () => {
    it("should move file successfully (copy + delete)", async () => {
      const result = await repository.moveFile(
        "source/file.jpg",
        "destination/file.jpg",
      );

      expect(mockFile.copy).toHaveBeenCalled();
      expect(mockFile.delete).toHaveBeenCalled();
      expect(result).toBe(
        "https://storage.googleapis.com/test-bucket/destination/file.jpg",
      );
    });

    it("should handle move errors during copy", async () => {
      mockFile.copy.mockRejectedValueOnce(new Error("Copy failed"));

      await expect(
        repository.moveFile("source/file.jpg", "destination/file.jpg"),
      ).rejects.toThrow("Copy failed");
    });
  });

  describe("exists", () => {
    it("should return true for existing files", async () => {
      const result = await repository.exists("images/test.jpg");

      expect(mockFile.exists).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false for non-existing files", async () => {
      mockFile.exists.mockResolvedValueOnce([false]);

      const result = await repository.exists("images/nonexistent.jpg");
      expect(result).toBe(false);
    });

    it("should return false on errors", async () => {
      mockFile.exists.mockRejectedValueOnce(new Error("Check failed"));

      const result = await repository.exists("images/test.jpg");
      expect(result).toBe(false);
    });
  });

  describe("getMetadata", () => {
    it("should return file metadata", async () => {
      const mockMetadata = {
        size: "1024",
        contentType: "image/jpeg",
        updated: "2024-01-01T00:00:00.000Z",
      };
      mockFile.getMetadata.mockResolvedValueOnce([mockMetadata]);

      const result = await repository.getMetadata("images/test.jpg");

      expect(result).toEqual(mockMetadata);
    });

    it("should handle metadata errors", async () => {
      mockFile.getMetadata.mockRejectedValueOnce(new Error("Metadata failed"));

      await expect(repository.getMetadata("images/test.jpg")).rejects.toThrow(
        "Metadata failed",
      );
    });
  });

  describe("setMetadata", () => {
    it("should set custom metadata", async () => {
      const customMetadata = { userId: "user123", category: "profile" };

      await repository.setMetadata("images/test.jpg", customMetadata);

      expect(mockFile.setMetadata).toHaveBeenCalledWith({
        metadata: customMetadata,
      });
    });

    it("should handle setMetadata errors", async () => {
      mockFile.setMetadata.mockRejectedValueOnce(
        new Error("Set metadata failed"),
      );

      await expect(
        repository.setMetadata("images/test.jpg", { key: "value" }),
      ).rejects.toThrow("Set metadata failed");
    });
  });

  describe("downloadFile", () => {
    it("should download file content", async () => {
      const expectedBuffer = Buffer.from("file content");
      mockFile.download.mockResolvedValueOnce([expectedBuffer]);

      const result = await repository.downloadFile("images/test.jpg");

      expect(mockFile.download).toHaveBeenCalled();
      expect(result).toEqual(expectedBuffer);
    });

    it("should handle download errors", async () => {
      mockFile.download.mockRejectedValueOnce(new Error("Download failed"));

      await expect(repository.downloadFile("images/test.jpg")).rejects.toThrow(
        "Download failed",
      );
    });
  });

  describe("private isPublic method", () => {
    it("should detect public files correctly", async () => {
      // Test through getFileUrl which uses isPublic
      const result = await repository.getFileUrl("images/public.jpg");

      expect(result).toBe(
        "https://storage.googleapis.com/test-bucket/images/public.jpg",
      );
    });

    it("should detect private files correctly", async () => {
      mockFile.getMetadata.mockResolvedValueOnce([
        {
          acl: [{ entity: "user123", role: "READER" }], // No allUsers
        },
      ]);

      const result = await repository.getFileUrl("images/private.jpg");

      expect(result).toBe("https://signed-url.com");
    });

    it("should handle missing ACL", async () => {
      mockFile.getMetadata.mockResolvedValueOnce([
        {
          // No acl property
        },
      ]);

      const result = await repository.getFileUrl("images/noAcl.jpg");

      expect(result).toBe("https://signed-url.com");
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle empty file lists", async () => {
      mockBucket.getFiles.mockResolvedValueOnce([[]]);

      const result = await repository.listFiles("empty/");

      expect(result).toEqual([]);
    });

    it("should handle malformed metadata in listFiles", async () => {
      const malformedFile = {
        ...mockFile,
        getMetadata: jest.fn().mockResolvedValue([
          {
            size: "invalid", // Invalid size
            contentType: null,
            updated: null,
            timeCreated: null,
          },
        ]),
      };
      mockBucket.getFiles.mockResolvedValueOnce([[malformedFile]]);

      const result = await repository.listFiles("malformed/");

      expect(result[0]).toEqual({
        name: "test-file.jpg",
        url: "https://storage.googleapis.com/test-bucket/test-file.jpg",
        size: NaN, // parseInt('invalid') returns NaN
        contentType: "application/octet-stream",
        updatedAt: expect.any(Date),
      });
    });

    it("should handle bucket initialization errors", () => {
      mockStorage.bucket.mockImplementation(() => {
        throw new Error("Bucket access denied");
      });

      expect(
        () => new GCSMediaRepository(mockStorage, "invalid-bucket"),
      ).toThrow("Bucket access denied");
    });

    it("should handle large file operations", async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const result = await repository.uploadFile(
        "large/file.bin",
        largeFile,
        "application/octet-stream",
      );

      expect(result).toBe(
        "https://storage.googleapis.com/test-bucket/large/file.bin",
      );
    });

    it("should handle special characters in file paths", async () => {
      const specialPath = "images/测试文件 (1).jpg";

      const result = await repository.uploadFile(
        specialPath,
        Buffer.from("test"),
        "image/jpeg",
      );

      expect(mockBucket.file).toHaveBeenCalledWith(specialPath);
      expect(result).toBe(
        `https://storage.googleapis.com/test-bucket/${specialPath}`,
      );
    });
  });
});
