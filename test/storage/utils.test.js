import { describe, test, expect } from 'vitest';
import getS3Config from '../../src/storage/utils.js';

describe('getS3Config', () => {
  test('should return correct S3 configuration', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://test-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key'
    };

    const result = getS3Config(mockEnv);

    expect(result).toEqual({
      region: 'auto',
      endpoint: 'https://test-s3-endpoint.com',
      credentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key'
      }
    });
  });

  test('should handle different environment configurations', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://prod-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'prod-access-key',
      S3_SECRET_ACCESS_KEY: 'prod-secret-key'
    };

    const result = getS3Config(mockEnv);

    expect(result.region).toBe('auto');
    expect(result.endpoint).toBe('https://prod-s3-endpoint.com');
    expect(result.credentials.accessKeyId).toBe('prod-access-key');
    expect(result.credentials.secretAccessKey).toBe('prod-secret-key');
  });

  test('should always return auto region', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://test-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key'
    };

    const result = getS3Config(mockEnv);

    expect(result.region).toBe('auto');
  });

  test('should structure credentials correctly', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://test-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key'
    };

    const result = getS3Config(mockEnv);

    expect(result.credentials).toHaveProperty('accessKeyId');
    expect(result.credentials).toHaveProperty('secretAccessKey');
    expect(typeof result.credentials.accessKeyId).toBe('string');
    expect(typeof result.credentials.secretAccessKey).toBe('string');
  });
});
