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
import { getCookie, TRUSTED_ORIGINS, DEFAULT_CORS_HEADERS } from '../src/cookie.js';

function createRequest(url, { method = 'GET', headers = {} } = {}) {
  const h = new Headers(headers);
  return new Request(url, { method, headers: h });
}

describe('getCookie', () => {
  describe('origin validation', () => {
    it('returns 403 when Origin header is missing', () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie');
      const result = getCookie(req);
      expect(result.status).to.equal(403);
      expect(result.headers.get('Content-Type')).to.equal('text/plain');
    });

    it('returns 403 when Origin is not trusted', () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: { Origin: 'https://evil.com' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(403);
    });

    it('accepts exact trusted origin https://da.live', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: { Origin: 'https://da.live' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(401);
    });

    it('accepts exact trusted origin http://localhost:3000', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: { Origin: 'http://localhost:3000' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(401);
    });

    it('accepts pattern origin https://X-da-live--adobe.aem.live', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: { Origin: 'https://main-da-live--adobe.aem.live' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(401);
    });

    it('accepts pattern origin https://X-da-live--adobe.aem.page', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: { Origin: 'https://main-da-live--adobe.aem.page' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(401);
    });
  });

  describe('method handling', () => {
    it('returns 405 for POST', () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        method: 'POST',
        headers: { Origin: 'https://da.live' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(405);
    });

    it('returns 200 with CORS headers for OPTIONS', () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        method: 'OPTIONS',
        headers: { Origin: 'https://da.live' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(200);
      expect(result.headers.get('Access-Control-Allow-Origin')).to.equal('https://da.live');
      expect(result.headers.get('Access-Control-Allow-Credentials')).to.equal('true');
    });
  });

  describe('cookie setting', () => {
    it('returns 401 when no Authorization header', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: { Origin: 'https://da.live' },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(401);
      expect(await result.text()).to.equal('401 Unauthorized');
    });

    it('sets cookie and returns 200 when Authorization Bearer has valid token', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: {
          Origin: 'https://da.live',
          Authorization: 'Bearer my-valid-token-123',
        },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(200);
      expect(await result.text()).to.equal('cookie set');
      const setCookie = result.headers.get('Set-Cookie');
      expect(setCookie).to.include('auth_token=my-valid-token-123');
      expect(setCookie).to.include('Secure');
      expect(setCookie).to.include('HttpOnly');
      expect(setCookie).to.include('SameSite=None');
      expect(setCookie).to.include('Partitioned');
    });

    it('sanitizes token and sets cookie when token has allowed chars', async () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: {
          Origin: 'https://da.live',
          Authorization: 'Bearer token_with-dots.and=signs',
        },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(200);
      const setCookie = result.headers.get('Set-Cookie');
      expect(setCookie).to.include('auth_token=token_with-dots.and=signs');
    });

    it('returns 401 when Bearer token is empty after sanitization', () => {
      const req = createRequest('https://example.com/org/site/.gimme_cookie', {
        headers: {
          Origin: 'https://da.live',
          Authorization: 'Bearer ???!!!',
        },
      });
      const result = getCookie(req);
      expect(result.status).to.equal(401);
    });
  });
});

describe('TRUSTED_ORIGINS', () => {
  it('includes da.live and localhost', () => {
    expect(TRUSTED_ORIGINS).to.include('https://da.live');
    expect(TRUSTED_ORIGINS).to.include('http://localhost:3000');
  });
});

describe('DEFAULT_CORS_HEADERS', () => {
  it('includes expected CORS and content-type keys', () => {
    expect(DEFAULT_CORS_HEADERS['Access-Control-Allow-Credentials']).to.equal('true');
    expect(DEFAULT_CORS_HEADERS['Content-Type']).to.equal('text/plain');
  });
});
