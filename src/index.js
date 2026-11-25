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
import { getDaCtx } from './utils/daCtx.js';
import getObject from './storage/object.js';
import { getCookie } from './cookie.js';

import { get404, daResp, getRobots } from './responses/index.js';
import getFromAdmin from './storage/admin.js';
import { isEmbeddableAsset } from './storage/utils.js';
import isHlx6Site from './utils/hlx6.js';

// https://www.aem.live/docs/security#backends-with-ip-filtering
const HELIX_ADMIN_IP = '3.227.118.73';

async function getFromStorage(pathname, env) {
  const daCtx = getDaCtx(env, pathname);
  const objResp = await getObject(env, daCtx);
  return daResp(objResp);
}

function isAllowListed(env, req, org) {
  return env.ADMIN_EXCEPTED_ORGS?.split(',').includes(org)
    && req.headers.get('cf-connecting-ip') === HELIX_ADMIN_IP;
}

function shouldGetFromStorage(env, req, pathname, org) {
  // When Helix Admin calls, allowlisted orgs always use storage
  if (isAllowListed(env, req, org)) {
    return true;
  }

  // Embeddable assets (images) go to admin by default unless org opts out
  if (isEmbeddableAsset(pathname)) {
    if (env.ADMIN_IMAGES_OPTOUT_ORGS?.split(',').includes(org)) {
      return true;
    }
    return false;
  }

  return false;
}

export default {
  /**
   * Routes migrated sites through admin before legacy R2 bypasses, keeping cookie endpoints local.
   * @param {Request} req Incoming content request.
   * @param {Object} env Worker bindings, storage settings and migration configuration.
   * @returns {Promise<Response>} Content response or explicit routing/configuration error.
   */
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === '/favicon.ico') return get404();
    if (pathname === '/robots.txt') return getRobots();

    let decodedPathname;
    try {
      decodedPathname = decodeURIComponent(pathname);
    } catch {
      return get404();
    }

    const parts = decodedPathname.split('/').filter((part) => part !== '' && part !== '.');
    if (parts.includes('..')) return get404();

    const [org, site, root] = parts;

    if (root === '.gimme_cookie') {
      return getCookie(req);
    }

    if (!org || !site) return get404();
    if (req.method === 'OPTIONS') return getFromAdmin(req, env);

    let migrated;
    try {
      migrated = await isHlx6Site(env, org, site);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[hlx6] Site backend resolution failed', e.message);
      const msg = 'Site backend resolution failed';
      const resp = daResp({
        status: 503,
        body: req.method === 'HEAD' ? undefined : msg,
        contentType: 'text/plain',
      });
      resp.headers.set('x-error', msg);
      resp.headers.set('access-control-expose-headers', 'x-error');
      resp.headers.set('cache-control', 'private, no-store');
      return resp;
    }

    if (migrated) return getFromAdmin(req, env);

    const normalizedOrg = org.toLowerCase();
    const normalizedPath = `/${parts.join('/')}${decodedPathname.endsWith('/') ? '/' : ''}`;

    if (shouldGetFromStorage(env, req, normalizedPath.toLowerCase(), normalizedOrg)) {
      return getFromStorage(normalizedPath, env);
    }

    return getFromAdmin(req, env);
  },
};
