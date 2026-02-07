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

/* eslint-env mocha */
import { expect } from 'chai';
import { Nock } from './utils.js';
import worker from '../src/index.js';

const HELIX_ADMIN_IP = '3.227.118.73';
const S3_BASE = 'https://s3-test.local';
const S3_BUCKET_HOST = 'https://test-bucket.s3-test.local';

function createRequest(url, { method = 'GET', headers = {} } = {}) {
  const h = new Headers(headers);
  return new Request(url, { method, headers: h });
}

function createEnv(overrides = {}) {
  return {
    AEM_BUCKET_NAME: 'test-bucket',
    ADMIN_EXCEPTED_ORGS: 'org1,org2,org3',
    S3_DEF_URL: S3_BASE,
    S3_ACCESS_KEY_ID: 'test-key',
    S3_SECRET_ACCESS_KEY: 'test-secret',
    daadmin: { fetch: globalThis.fetch },
    ...overrides,
  };
}

describe('Index Tests', () => {
  /** @type {ReturnType<typeof Nock>} */
  let nock;

  beforeEach(() => {
    nock = new Nock().env();
  });

  afterEach(() => {
    nock.done();
  });

  describe('robots.txt handling', () => {
    it('returns robots.txt for /robots.txt path', async () => {
      const req = createRequest('https://example.com/robots.txt');
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.include('Disallow: /');
    });
  });

  describe('favicon and 404', () => {
    it('returns 404 for favicon.ico', async () => {
      const req = createRequest('https://example.com/favicon.ico');
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(404);
    });

    it('returns 404 for missing org/site', async () => {
      const req = createRequest('https://example.com/org');
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(404);
    });

    it('returns 404 for root path', async () => {
      const req = createRequest('https://example.com/');
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(404);
    });
  });

  describe('OPTIONS request handling', () => {
    it('handles OPTIONS through admin (no fetch)', async () => {
      const req = createRequest('https://example.com/org/site/page', { method: 'OPTIONS' });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
    });
  });

  describe('cookie endpoint', () => {
    it('calls getCookie for .gimme_cookie path', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: { Origin: 'https://da.live' },
      });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(401);
      expect(await result.text()).to.equal('401 Unauthorized');
    });
  });

  describe('admin access (allowlisted vs not)', () => {
    it('uses storage for allowlisted org with correct IP', async () => {
      nock.s3(S3_BUCKET_HOST).get(/\/.+/).reply(200, 'storage content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org1/site/page', {
        headers: { 'cf-connecting-ip': HELIX_ADMIN_IP },
      });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('storage content');
    });

    it('uses admin for non-excepted org', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(200, 'admin content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/other-org/site/page', {
        headers: { 'cf-connecting-ip': HELIX_ADMIN_IP },
      });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('admin content');
    });

    it('uses admin for wrong IP even when org is excepted', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(200, 'admin content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org1/site/page', {
        headers: { 'cf-connecting-ip': '192.168.1.2' },
      });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('admin content');
    });

    it('uses admin when ADMIN_EXCEPTED_ORGS is missing', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(200, 'admin content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org1/site/page', {
        headers: { 'cf-connecting-ip': HELIX_ADMIN_IP },
      });
      const env = createEnv();
      delete env.ADMIN_EXCEPTED_ORGS;

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('admin content');
    });
  });

  describe('embeddable assets (storage by default)', () => {
    it('uses storage for .png when not allowlisted', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/.+/)
        .reply(200, 'fake-png-bytes', { 'content-type': 'image/png' });

      const req = createRequest('https://example.com/some-org/site/logo.png', {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('fake-png-bytes');
    });

    it('uses admin for embeddable asset when org is in ADMIN_OPTIN_ORGS', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(200, 'admin content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/optin-org/site/logo.png', {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      });
      const env = createEnv({ ADMIN_OPTIN_ORGS: 'optin-org' });

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('admin content');
    });

    it('uses storage for .svg', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/.+/)
        .reply(200, '<svg/>', { 'content-type': 'image/svg+xml' });

      const req = createRequest('https://example.com/some-org/site/icon.svg', {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('<svg/>');
    });
  });

  describe('missing cf-connecting-ip', () => {
    it('uses admin when cf-connecting-ip is missing', async () => {
      nock.admin()
        .get(/\/source\/.+/)
        .reply(200, 'admin content', { 'content-type': 'text/html' });

      const req = createRequest('https://example.com/org1/site/page');
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('admin content');
    });
  });

  describe('S3 errors', () => {
    it('returns 404 when S3 returns error', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/.+/)
        .reply(404);

      const req = createRequest('https://example.com/org1/site/missing', {
        headers: { 'cf-connecting-ip': HELIX_ADMIN_IP },
      });
      const env = createEnv();

      const result = await worker.fetch(req, env);

      expect(result.status).to.equal(404);
    });
  });
});
