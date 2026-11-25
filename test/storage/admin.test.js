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
    it('returns 405 with CORS headers for non-GET/HEAD requests', async () => {
      const req = createRequest('https://example.com/org/site/page', { method: 'POST' });
      const env = createEnv();

      const result = await getFromAdmin(req, env);

      expect(result.status).to.equal(405);
      expect(result.headers.get('access-control-allow-origin')).to.equal('*');
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

    it('forwards percent-encoded asset filenames to admin without decoding them', async () => {
      const urls = [];
      const space = await getFromAdmin(createRequest('https://example.com/org/site/My%20Image.png'), {
        daadmin: {
          fetch: async (url) => {
            urls.push(url);
            return new Response('space');
          },
        },
      });
      expect(space.status).to.equal(200);
      expect(urls).to.deep.equal(['https://admin.da.live/source/org/site/my%20image.png']);

      nock.admin().get('/source/org/site/a%23b.png').reply(200, 'hash');
      nock.admin().get('/source/org/site/100%25.png').reply(200, 'percent');

      const hash = await getFromAdmin(createRequest('https://example.com/org/site/a%23b.png'), createEnv());
      expect(hash.status).to.equal(200);
      expect(await hash.text()).to.equal('hash');

      const percent = await getFromAdmin(createRequest('https://example.com/org/site/100%25.png'), createEnv());
      expect(percent.status).to.equal(200);
      expect(await percent.text()).to.equal('percent');
    });

    it('decodes valid percent-encoding and returns 404 on malformed encoding', async () => {
      nock.admin()
        .get('/source/org/site/page.html')
        .reply(200, 'ok', { 'content-type': 'text/html' });

      const encoded = await getFromAdmin(createRequest('https://example.com/org/%73ite/page'), createEnv());
      expect(encoded.status).to.equal(200);

      const invalid = await getFromAdmin(createRequest('https://example.com/org/%E0%A4%A/page'), createEnv());
      expect(invalid.status).to.equal(404);
    });
  });

  describe('admin API integration', () => {
    it('forwards HEAD 200 metadata including content-length without a body, and omits upstream content-length on GET', async () => {
      nock.admin().head('/source/org/site/page.html')
        .matchHeader('if-match', '"v1"')
        .reply(200, '', {
          'content-type': 'text/html',
          'content-length': '128',
          etag: '"v1"',
          'last-modified': 'Mon, 23 Nov 2026 10:00:00 GMT',
        });
      const headRes = await getFromAdmin(createRequest('https://example.com/org/site/page', {
        method: 'HEAD', headers: { 'if-match': '"v1"' },
      }), createEnv());
      expect(headRes.status).to.equal(200);
      expect(await headRes.text()).to.equal('');
      expect(headRes.headers.get('content-length')).to.equal('128');
      expect(headRes.headers.get('etag')).to.equal('"v1"');
      expect(headRes.headers.get('last-modified')).to.equal('Mon, 23 Nov 2026 10:00:00 GMT');

      nock.admin().get('/source/org/site/page.html')
        .reply(200, 'hello', { 'content-type': 'text/html', 'content-length': '999' });
      const getRes = await getFromAdmin(createRequest('https://example.com/org/site/page'), createEnv());
      expect(getRes.status).to.equal(200);
      expect(getRes.headers.get('content-length')).to.equal(null);
      expect(await getRes.text()).to.equal('hello');
    });
    it('forwards conditional HEAD and exposes metadata without a body', async () => {
      nock.admin().head('/source/org/site/page.html')
        .matchHeader('if-none-match', '"revision"')
        .reply(304, '', { etag: '"revision"', 'cache-control': 'private, no-store' });
      const result = await getFromAdmin(createRequest('https://example.com/org/site/page', {
        method: 'HEAD', headers: { 'if-none-match': '"revision"' },
      }), createEnv());
      expect(result.status).to.equal(304);
      expect(await result.text()).to.equal('');
      expect(result.headers.get('etag')).to.equal('"revision"');
      expect(result.headers.get('cache-control')).to.equal('private, no-store');
      expect(result.headers.get('access-control-expose-headers')).to.include('ETag');
    });

    it('preserves upstream error details', async () => {
      nock.admin().get('/source/org/site/page.html')
        .reply(429, 'limited', { 'x-error': 'receiver limit', 'retry-after': '30' });
      const result = await getFromAdmin(createRequest('https://example.com/org/site/page'), createEnv());
      expect(result.status).to.equal(429);
      expect(await result.text()).to.equal('limited');
      expect(result.headers.get('x-error')).to.equal('receiver limit');
      expect(result.headers.get('retry-after')).to.equal('30');
    });

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
      expect(result.headers.get('access-control-allow-origin')).to.equal('*');
      expect(result.headers.get('access-control-expose-headers')).to.equal('x-error');
    });
  });

  describe('response body streaming', () => {
    it('forwards the upstream body without fully buffering it in memory', async () => {
      const upstreamBody = new TextEncoder().encode('image-bytes');
      const upstream = new Response(upstreamBody, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });
      const fullBufferReads = [];
      const proxied = new Proxy(upstream, {
        get(target, prop) {
          if (prop === 'blob' || prop === 'arrayBuffer' || prop === 'text') {
            return async () => {
              fullBufferReads.push(prop);
              return target[prop]();
            };
          }
          const value = target[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });

      const req = createRequest('https://example.com/org/site/photo.jpg');
      const env = { daadmin: { fetch: async () => proxied } };

      const result = await getFromAdmin(req, env);

      expect(fullBufferReads, 'worker must not read the upstream body into memory before responding').to.deep.equal([]);
      expect(result.status).to.equal(200);
      expect(result.headers.get('content-type')).to.equal('image/jpeg');
      const out = new Uint8Array(await result.arrayBuffer());
      expect(out).to.deep.equal(upstreamBody);
    });
  });
});
