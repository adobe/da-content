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
function parseBackend(value, key) {
  if (value === null) return undefined;
  const backend = value.trim().toLowerCase();
  if (backend === 'hlx6' || backend === 'da') return backend;
  throw new Error(`Invalid site backend for ${key}`);
}

async function detectHlx6Site(namespace, key, hlxAdmin) {
  const cached = parseBackend(await namespace.get(key), key);
  if (cached !== undefined) return cached === 'hlx6';
  const base = (hlxAdmin || 'https://admin.hlx.page').replace(/\/+$/, '');
  const path = key.split('/').map(encodeURIComponent).join('/');
  const resp = await fetch(`${base}/ping/${path}`, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(3000),
  });
  await resp.body?.cancel();
  // Unregistered sites may be created later, so their DA result is short-lived.
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`Site backend probe failed for ${key}: ${resp.status}`);
  }
  const migrated = resp.headers.has('x-api-upgrade-available');
  try {
    await namespace.put(key, migrated ? 'hlx6' : 'da', resp.status === 404 ? { expirationTtl: 300 } : undefined);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[hlx6] Failed to cache site backend', key, e.message);
  }
  return migrated;
}

/**
 * Resolves the shared site registry, probing missing entries.
 * Request-scoped I/O is never shared between Worker requests.
 * @param {Object} env Worker bindings.
 * @param {string} org Content organization.
 * @param {string} site Content site.
 * @returns {Promise<boolean>} Whether requests must use admin rather than direct R2.
 * @throws {Error} If registry access or the ping fails.
 */
export default async function isHlx6Site(env, org, site) {
  if (!org || !site) return false;
  const key = `${org}/${site}`.toLowerCase();
  const namespace = env.DA_SITE_BACKENDS;
  if (!namespace) throw new Error('Missing DA_SITE_BACKENDS binding');
  return detectHlx6Site(namespace, key, env.HLX_ADMIN);
}
