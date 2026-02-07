/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
import { expect } from 'chai';
import { Nock } from '../utils.js';
import getFromAdmin from '../../src/storage/admin.js';

function createRequest(url, { method = 'GET', headers = {} } = {}) {
  const h = new Headers(headers);
  return new Request(url, { method, headers: h });
}

function createEnv() {
  return { daadmin: { fetch: globalThis.fetch } };
}

describe('getFromAdmin', () => {
  /** @type {ReturnType<typeof Nock>} */
  let nock;

  beforeEach(() => {
    nock = new Nock().env();
  });

  afterEach(() => {
    nock.done();
  });

  describe('HTTP method handling', () => {
    it('returns 405 for non-GET requests', async () => {
      const req = createRequest('https://example.com/org/site/page', { method: 'POST' });
      const env = createEnv();

      const result = await getFromAdmin(req, env);

      expect(result.status).to.equal(405);
    });

    it('handles OPTIONS with 200 without fetching', async () => {
      const req = createRequest('https://example.com/org/site/page', { method: 'OPTIONS' });
      const env = createEnv();

      const result = await getFromAdmin(req, env);

      expect(result.status).to.equal(200);
    });

    it('allows GET and fetches admin', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(200, 'content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page');
      const env = createEnv();

      const result = await getFromAdmin(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('content');
    });
  });

  describe('authentication handling', () => {
    it('sends Bearer token from cookie', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .matchHeader('authorization', 'Bearer cookie-token')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page', {
        headers: { cookie: 'auth_token=cookie-token' },
      });
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });

    it('uses authorization header when cookie not present', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .matchHeader('authorization', 'Bearer header-token')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page', {
        headers: { authorization: 'Bearer header-token' },
      });
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });

    it('uses query token when no other auth present', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .matchHeader('authorization', (val) => val === 'Bearer query-token')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page?token=query-token');
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });

    it('does not use cookie auth when cookie header is present but empty', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page', {
        headers: { cookie: '' },
      });
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });
  });

  describe('path canonicalization', () => {
    it('converts path to lowercase', async () => {
      nock.admin()
        .get('/source/org/site/page.html')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/ORG/SITE/PAGE');
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });

    it('adds index for trailing slash', async () => {
      nock.admin()
        .get('/source/org/site/index.html')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/');
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });

    it('adds .html for path without extension', async () => {
      nock.admin()
        .get('/source/org/site/page.html')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page');
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });

    it('preserves existing file extensions', async () => {
      nock.admin()
        .get('/source/org/site/image.jpg')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/image.jpg');
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });
  });

  describe('admin API integration', () => {
    it('constructs correct admin URL', async () => {
      nock.admin()
        .get('/source/org/site/page.html')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page');
      const env = createEnv();

      const result = await getFromAdmin(req, env);
      expect(result.status).to.equal(200);
    });

    it('forwards response status and headers', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(201, 'created content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org/site/page');
      const env = createEnv();

      const result = await getFromAdmin(req, env);

      expect(result.status).to.equal(201);
      expect(result.headers.get('content-type')).to.equal('text/html');
      expect(await result.text()).to.equal('created content');
    });
  });

  describe('error handling', () => {
    it('returns 503 when admin fetch fails', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .replyWithError('Network error');

      const req = createRequest('https://example.com/org/site/page');
      const env = createEnv();

      const result = await getFromAdmin(req, env);

      expect(result.status).to.equal(503);
      expect(result.headers.get('x-error')).to.equal('Failed to fetch from admin');
    });
  });
});
