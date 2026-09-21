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
import { daResp } from './responses/index.js';

export const TRUSTED_ORIGINS = [
  'https://da.live',
  'https://preview-aemcoder.adobe.io',
  'https://preview-excat-stage.adobe.io',
  'http://localhost:3000',
  'https://localhost:3000',
];

// Trusted patterns for dynamic subdomains.
export const TRUSTED_ORIGIN_PATTERNS = [
  // da.live: https://<alphanumeric>--da-live--adobe.aem.(live|page)
  /^https:\/\/[a-zA-Z0-9]+-?-da-live--adobe\.aem\.(live|page)$/,
  // ABV PR previews
  /^https:\/\/pr-\d+\.d2ikwb7s634epv\.amplifyapp\.com$/,
  // ABV demo PR previews
  /^https:\/\/pr-\d+-demo\.dklz75mbshc2w\.amplifyapp\.com$/,
];

export const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'text/plain',
};

/**
 * Check if the origin is trusted.
 * Supports exact matches and pattern matching for dynamic-subdomain deployments.
 */
function isTrustedOrigin(origin) {
  if (!origin) return false;
  if (TRUSTED_ORIGINS.includes(origin)) return true;
  return TRUSTED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

export function getCookie(req) {
  if (!isTrustedOrigin(req.headers.get('Origin'))) {
    return daResp({ body: '403 Forbidden', status: 403, contentType: 'text/plain' });
  }

  if (!['GET', 'OPTIONS'].includes(req.method)) {
    return new Response('', { status: 405 });
  }

  if (req.method === 'OPTIONS') {
    const respHeaders = new Headers();
    respHeaders.append('Access-Control-Allow-Origin', req.headers.get('Origin'));
    Object.entries(DEFAULT_CORS_HEADERS).forEach(([key, value]) => {
      respHeaders.append(key, value);
    });
    return new Response('', { headers: respHeaders });
  }

  const { headers } = req;

  const authToken = headers.get('Authorization');
  if (authToken) {
    const cookieValue = authToken.split(' ')[1]?.replace(/[^a-zA-Z0-9\-_.=]/g, '') || null;

    if (cookieValue) {
      const respHeaders = new Headers();
      respHeaders.append('Set-Cookie', `auth_token=${cookieValue}; Secure; Path=/; HttpOnly; SameSite=None; Partitioned; Max-Age=84600`);
      respHeaders.append('Access-Control-Allow-Origin', req.headers.get('Origin'));
      Object.entries(DEFAULT_CORS_HEADERS).forEach(([key, value]) => {
        respHeaders.append(key, value);
      });

      return new Response('cookie set', { headers: respHeaders });
    }
  }
  return daResp({ body: '401 Unauthorized', status: 401, contentType: 'text/plain' });
}
