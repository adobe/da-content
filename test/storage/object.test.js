import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock the AWS SDK modules
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  GetObjectCommand: vi.fn()
}));

// Mock the utils module
vi.mock('../../src/storage/utils.js', () => ({
  default: vi.fn()
}));

// Import after mocking
import getObject from '../../src/storage/object.js';
import getS3Config from '../../src/storage/utils.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

describe('getObject', () => {
  let mockS3Client;
  let mockSend;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Mock the S3Client constructor
    mockSend = vi.fn();
    mockS3Client = {
      send: mockSend
    };
    S3Client.mockImplementation(() => mockS3Client);
    
    // Mock the utils function
    getS3Config.mockReturnValue({
      region: 'auto',
      endpoint: 'https://test-s3-endpoint.com',
      credentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key'
      }
    });
  });

  describe('successful object retrieval', () => {
    test('should return object data when S3 call succeeds', async () => {
      const mockEnv = { AEM_BUCKET_NAME: 'test-bucket' };
      const mockDaCtx = {
        bucket: 'test-bucket',
        org: 'test-org',
        key: 'test-key'
      };

      const mockS3Response = {
        Body: 'test-content',
        $metadata: { httpStatusCode: 200 },
        ContentType: 'text/html',
        ContentLength: 123
      };

      mockSend.mockResolvedValue(mockS3Response);

      const result = await getObject(mockEnv, mockDaCtx);

      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test-s3-endpoint.com',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key'
        }
      });

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-org/test-key'
      });

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));

      expect(result).toEqual({
        body: 'test-content',
        status: 200,
        contentType: 'text/html',
        contentLength: 123
      });
    });

    test('should handle different content types', async () => {
      const mockEnv = { AEM_BUCKET_NAME: 'test-bucket' };
      const mockDaCtx = {
        bucket: 'test-bucket',
        org: 'test-org',
        key: 'image.jpg'
      };

      const mockS3Response = {
        Body: 'image-data',
        $metadata: { httpStatusCode: 200 },
        ContentType: 'image/jpeg',
        ContentLength: 456
      };

      mockSend.mockResolvedValue(mockS3Response);

      const result = await getObject(mockEnv, mockDaCtx);

      expect(result.contentType).toBe('image/jpeg');
      expect(result.contentLength).toBe(456);
    });
  });

  describe('error handling', () => {
    test('should return 404 when S3 call fails', async () => {
      const mockEnv = { AEM_BUCKET_NAME: 'test-bucket' };
      const mockDaCtx = {
        bucket: 'test-bucket',
        org: 'test-org',
        key: 'nonexistent-key'
      };

      mockSend.mockRejectedValue(new Error('Object not found'));

      const result = await getObject(mockEnv, mockDaCtx);

      expect(result).toEqual({
        body: '',
        status: 404
      });
    });

    test('should handle S3 client errors gracefully', async () => {
      const mockEnv = { AEM_BUCKET_NAME: 'test-bucket' };
      const mockDaCtx = {
        bucket: 'test-bucket',
        org: 'test-org',
        key: 'test-key'
      };

      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await getObject(mockEnv, mockDaCtx);

      expect(result).toEqual({
        body: '',
        status: 404
      });
    });
  });

  describe('input building', () => {
    test('should build correct S3 input with org prefix', async () => {
      const mockEnv = { AEM_BUCKET_NAME: 'test-bucket' };
      const mockDaCtx = {
        bucket: 'test-bucket',
        org: 'my-org',
        key: 'site/page.html'
      };

      mockSend.mockResolvedValue({
        Body: 'content',
        $metadata: { httpStatusCode: 200 },
        ContentType: 'text/html',
        ContentLength: 100
      });

      await getObject(mockEnv, mockDaCtx);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'my-org/site/page.html'
      });
    });

    test('should handle different bucket names', async () => {
      const mockEnv = { AEM_BUCKET_NAME: 'custom-bucket' };
      const mockDaCtx = {
        bucket: 'custom-bucket',
        org: 'test-org',
        key: 'test-key'
      };

      mockSend.mockResolvedValue({
        Body: 'content',
        $metadata: { httpStatusCode: 200 },
        ContentType: 'text/html',
        ContentLength: 100
      });

      await getObject(mockEnv, mockDaCtx);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'custom-bucket',
        Key: 'test-org/test-key'
      });
    });
  });

  describe('S3 client configuration', () => {
    test('should create S3Client with correct configuration', async () => {
      const mockEnv = { AEM_BUCKET_NAME: 'test-bucket' };
      const mockDaCtx = {
        bucket: 'test-bucket',
        org: 'test-org',
        key: 'test-key'
      };

      mockSend.mockResolvedValue({
        Body: 'content',
        $metadata: { httpStatusCode: 200 },
        ContentType: 'text/html',
        ContentLength: 100
      });

      await getObject(mockEnv, mockDaCtx);

      expect(getS3Config).toHaveBeenCalledWith(mockEnv);
      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test-s3-endpoint.com',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key'
        }
      });
    });
  });
});
