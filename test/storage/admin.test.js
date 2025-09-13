/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import {
  describe, test, expect, vi, beforeEach,
} from 'vitest';

// Import after mocking
import { parse } from 'cookie';
import getFromAdmin from '../../src/storage/admin.js';
import { daResp } from '../../src/responses/index.js';

// Mock the cookie parser and responses
vi.mock('cookie', () => ({
  parse: vi.fn(),
}));

vi.mock('../../src/responses/index.js', () => ({
  daResp: vi.fn(),
}));

describe('getFromAdmin', () => {
  let mockEnv;
  let mockReq;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnv = {
      daadmin: {
        fetch: vi.fn(),
      },
    };

    mockReq = {
      method: 'GET',
      url: 'https://example.com/org/site/page',
      headers: new Map(),
    };

    // Mock the daResp function
    daResp.mockImplementation(({ body, status }) => new Response(body, { status }));
  });

  describe('HTTP method handling', () => {
    test('should return 405 for non-GET requests', async () => {
      mockReq.method = 'POST';

      const result = await getFromAdmin(mockReq, mockEnv);

      expect(result.status).toBe(405);
    });

    test('should handle OPTIONS request with daResp', async () => {
      mockReq.method = 'OPTIONS';

      await getFromAdmin(mockReq, mockEnv);

      expect(daResp).toHaveBeenCalledWith({ body: '', status: 200 });
    });

    test('should allow GET requests', async () => {
      mockReq.method = 'GET';
      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      expect(mockEnv.daadmin.fetch).toHaveBeenCalled();
    });
  });

  describe('authentication handling', () => {
    test('should extract auth token from cookie', async () => {
      parse.mockReturnValue({ auth_token: 'cookie-token' });
      mockReq.headers.set('cookie', 'auth_token=cookie-token');

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      const { headers } = fetchCall[1];
      expect(headers.get('authorization')).toBe('Bearer cookie-token');
    });

    test('should use authorization header when cookie not present', async () => {
      parse.mockReturnValue({});
      mockReq.headers.set('authorization', 'Bearer header-token');

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      const { headers } = fetchCall[1];
      expect(headers.get('authorization')).toBe('Bearer header-token');
    });

    test('should use query parameter token when no other auth present', async () => {
      parse.mockReturnValue({});
      mockReq.url = 'https://example.com/org/site/page?token=query-token';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      const { headers } = fetchCall[1];
      expect(headers.get('authorization')).toBe('Bearer query-token');
    });

    test('should not set authorization header when no auth present', async () => {
      parse.mockReturnValue({});

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      const { headers } = fetchCall[1];
      expect(headers.get('authorization')).toBeNull();
    });
  });

  describe('path canonicalization', () => {
    test('should convert path to lowercase', async () => {
      mockReq.url = 'https://example.com/ORG/SITE/PAGE';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/org/site/page.html');
    });

    test('should add index.html for trailing slash', async () => {
      mockReq.url = 'https://example.com/org/site/';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/org/site/index.html');
    });

    test('should add .html extension for files without extension', async () => {
      mockReq.url = 'https://example.com/org/site/page';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/org/site/page.html');
    });

    test('should preserve existing file extensions', async () => {
      mockReq.url = 'https://example.com/org/site/image.jpg';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/org/site/image.jpg');
    });

    test('should sanitize special characters', async () => {
      mockReq.url = 'https://example.com/org/site/page%20with%20spaces';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      // The actual implementation keeps the URL-encoded characters
      expect(fetchCall[0]).toContain('/org/site/page20with20spaces.html');
    });
  });

  describe('admin API integration', () => {
    test('should construct correct admin URL', async () => {
      mockReq.url = 'https://example.com/org/site/page';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://admin.da.live/source/org/site/page.html');
    });

    test('should forward response status and headers', async () => {
      const mockHeaders = new Map([['content-type', 'text/html']]);
      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 201,
        headers: mockHeaders,
        blob: vi.fn().mockResolvedValue('created content'),
      });

      const result = await getFromAdmin(mockReq, mockEnv);

      expect(result.status).toBe(201);
      expect(result.headers.get('content-type')).toBe('text/html');
    });

    test('should handle successful admin response', async () => {
      const mockBlob = vi.fn().mockResolvedValue('admin content');
      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: mockBlob,
      });

      const result = await getFromAdmin(mockReq, mockEnv);

      expect(mockBlob).toHaveBeenCalled();
      expect(result.status).toBe(200);
    });
  });

  describe('error handling', () => {
    test('should handle admin fetch errors gracefully', async () => {
      mockEnv.daadmin.fetch.mockRejectedValue(new Error('Network error'));

      const result = await getFromAdmin(mockReq, mockEnv);

      expect(result.status).toBe(503);
      expect(result.headers.get('x-error')).toBe('Failed to fetch from admin');
    });

    test('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockEnv.daadmin.fetch.mockRejectedValue(new Error('Test error'));

      await getFromAdmin(mockReq, mockEnv);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch from admin', expect.any(Error));
      consoleSpy.mockRestore();
    });

    test('should log successful admin requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      expect(consoleSpy).toHaveBeenCalledWith('-> get from admin', expect.stringContaining('admin.da.live'));
      expect(consoleSpy).toHaveBeenCalledWith('<- admin responded with:', 200);
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    test('should handle empty pathname', async () => {
      mockReq.url = 'https://example.com/';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/index.html');
    });

    test('should handle complex nested paths', async () => {
      mockReq.url = 'https://example.com/org/site/section/subsection/page';

      mockEnv.daadmin.fetch.mockResolvedValue({
        status: 200,
        headers: new Map(),
        blob: vi.fn().mockResolvedValue('content'),
      });

      await getFromAdmin(mockReq, mockEnv);

      const fetchCall = mockEnv.daadmin.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/org/site/section/subsection/page.html');
    });
  });
});
