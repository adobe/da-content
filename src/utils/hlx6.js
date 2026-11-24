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
const siteLookups = new WeakMap();

async function detectHlx6Site(namespace, key) {
  const cached = await namespace.get(key);
  if (cached === 'hlx6' || cached === 'da') return cached === 'hlx6';
  if (cached !== null) throw new Error(`Invalid site backend for ${key}`);

  const path = key.split('/').map(encodeURIComponent).join('/');
  const resp = await fetch(`https://admin.hlx.page/ping/${path}`, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(3000),
  });
  await resp.body?.cancel();
  // Unregistered DA sites return 404; transport/auth/server errors are not DA results.
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`Site backend probe failed for ${key}: ${resp.status}`);
  }
  const migrated = resp.headers.has('x-api-upgrade-available');
  await namespace.put(key, migrated ? 'hlx6' : 'da');
  return migrated;
}

/**
 * Resolves the shared site registry, probing missing entries.
 * Only in-flight lookups are memoized so manual KV updates are not hidden by isolate caches.
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
  let pending = siteLookups.get(namespace);
  if (!pending) {
    pending = new Map();
    siteLookups.set(namespace, pending);
  }
  if (!pending.has(key)) pending.set(key, detectHlx6Site(namespace, key));
  try {
    return await pending.get(key);
  } finally {
    pending.delete(key);
  }
}
