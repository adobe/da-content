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
import { describe, test, expect } from 'vitest';
import { daResp, get404, getRobots } from '../../src/responses/index.js';

describe('daResp', () => {
  test('should create response with basic properties', () => {
    const input = {
      body: 'test content',
      status: 200,
    };

    const response = daResp(input);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('authorization');
  });

  test('should include content type when provided', () => {
    const input = {
      body: '<html>content</html>',
      status: 200,
      contentType: 'text/html',
    };

    const response = daResp(input);

    expect(response.headers.get('Content-Type')).toBe('text/html');
  });

  test('should not include content type when not provided', () => {
    const input = {
      body: 'plain text',
      status: 200,
    };

    const response = daResp(input);

    // Response constructor automatically sets Content-Type for string bodies
    expect(response.headers.get('Content-Type')).toBe('text/plain;charset=UTF-8');
  });

  test('should handle different status codes', () => {
    const input = {
      body: 'error message',
      status: 404,
    };

    const response = daResp(input);

    expect(response.status).toBe(404);
  });

  test('should handle empty body', () => {
    const input = {
      body: '',
      status: 200,
    };

    const response = daResp(input);

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  test('should handle null body', () => {
    const input = {
      body: null,
      status: 200,
    };

    const response = daResp(input);

    expect(response.status).toBe(200);
  });

  test('should always include CORS headers', () => {
    const input = {
      body: 'test',
      status: 500,
    };

    const response = daResp(input);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('authorization');
  });
});

describe('get404', () => {
  test('should return 404 response', () => {
    const response = get404();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(404);
  });

  test('should include CORS headers', () => {
    const response = get404();

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('authorization');
  });

  test('should have empty body', () => {
    const response = get404();

    expect(response.body).toBeDefined();
  });
});

describe('getRobots', () => {
  test('should return robots.txt content', () => {
    const response = getRobots();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });

  test('should include correct robots.txt content', async () => {
    const response = getRobots();
    const body = await response.text();

    expect(body).toBe('User-agent: *\nDisallow: /');
  });

  test('should include CORS headers', () => {
    const response = getRobots();

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('authorization');
  });

  test('should not include content type header', () => {
    const response = getRobots();

    // Response constructor automatically sets Content-Type for string bodies
    expect(response.headers.get('Content-Type')).toBe('text/plain;charset=UTF-8');
  });
});

describe('Response object properties', () => {
  test('should create valid Response objects', () => {
    const daResponse = daResp({ body: 'test', status: 200 });
    const notFoundResponse = get404();
    const robotsResponse = getRobots();

    expect(daResponse).toBeInstanceOf(Response);
    expect(notFoundResponse).toBeInstanceOf(Response);
    expect(robotsResponse).toBeInstanceOf(Response);
  });

  test('should handle different response bodies', () => {
    const textResponse = daResp({ body: 'text content', status: 200 });
    const htmlResponse = daResp({ body: '<html>content</html>', status: 200, contentType: 'text/html' });
    const jsonResponse = daResp({ body: '{"key": "value"}', status: 200, contentType: 'application/json' });

    expect(textResponse.status).toBe(200);
    expect(htmlResponse.headers.get('Content-Type')).toBe('text/html');
    expect(jsonResponse.headers.get('Content-Type')).toBe('application/json');
  });
});
