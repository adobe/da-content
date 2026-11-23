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
/**
 * Parses dashboard arrays, JSON arrays or comma/newline-separated migration entries.
 * @param {string[]|string|undefined} value Migration-variable value.
 * @param {string} name Variable name used in configuration errors.
 * @returns {unknown[]} Parsed entries, or an empty array for an unset variable.
 * @throws {Error} If a provided value has an unsupported type or malformed JSON array.
 */
function entries(value, name) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${name}`);
  }
  if (!value.trim().startsWith('[')) return value.split(/[,\n]/);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    throw new Error(`Invalid JSON in ${name}`);
  }
  throw new Error(`Invalid ${name}`);
}

/**
 * Normalizes a single org/site entry, ignoring values that do not identify exactly two segments.
 * @param {unknown} value Candidate org/site entry.
 * @returns {string|undefined} Lowercase org/site key, or undefined for an invalid entry.
 */
function orgSite(value) {
  if (typeof value !== 'string') return undefined;
  const parts = value.trim().toLowerCase().split('/').filter(Boolean);
  return parts.length === 2 ? parts.join('/') : undefined;
}

/**
 * Selects migrated sources for admin routing while excluding valid dual-write source entries.
 * A mapped dual-write target does not exempt that target from migrated routing.
 * @param {Object} env Worker migration configuration.
 * @param {string[]|string} [env.HLX6_MIGRATED_SITES] Migrated org/site entries.
 * @param {string[]|string} [env.HLX6_DUAL_WRITES] Source entries with optional target mappings.
 * @param {string} org Content organization.
 * @param {string} site Content site.
 * @returns {boolean} Whether requests must use admin rather than direct R2.
 * @throws {Error} If either configured migration list cannot be parsed.
 */
export default function isHlx6Site(env, org, site) {
  const key = `${org}/${site}`.toLowerCase();
  const migrated = entries(env.HLX6_MIGRATED_SITES, 'HLX6_MIGRATED_SITES')
    .some((entry) => typeof entry === 'string' && !entry.includes('->') && orgSite(entry) === key);
  const dualWrite = entries(env.HLX6_DUAL_WRITES, 'HLX6_DUAL_WRITES').some((entry) => {
    if (typeof entry !== 'string') return false;
    const [from, to, ...rest] = entry.split('->');
    return !rest.length && orgSite(from) === key && (to === undefined || !!orgSite(to));
  });
  return migrated && !dualWrite;
}
