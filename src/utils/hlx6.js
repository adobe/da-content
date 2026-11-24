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
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) {
    throw new Error(`Invalid ${name}`);
  }
  if (!trimmed.startsWith('[')) return value.split(/[,\n]/);
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON in ${name}`);
  }
}

/**
 * Normalizes a single org/site entry, ignoring values that do not identify exactly two segments.
 * @param {string} value Candidate org/site entry.
 * @returns {string|undefined} Lowercase org/site key, or undefined for an invalid entry.
 */
function orgSite(value) {
  const parts = value.trim().toLowerCase().split('/').filter(Boolean);
  return parts.length === 2 ? parts.join('/') : undefined;
}

let migratedCache = { raw: undefined, sites: new Set() };
let dualWriteCache = { raw: undefined, sources: new Set() };

/**
 * Parses and caches migrated org/site entries keyed by the raw configuration value.
 * @param {string[]|string|undefined} raw Raw HLX6_MIGRATED_SITES configuration.
 * @returns {Set<string>} Normalized migrated org/site keys.
 * @throws {Error} If HLX6_MIGRATED_SITES cannot be parsed.
 */
function getMigratedSites(raw) {
  if (migratedCache.raw === raw) return migratedCache.sites;
  const sites = new Set();
  entries(raw, 'HLX6_MIGRATED_SITES').forEach((entry) => {
    if (typeof entry === 'string' && !entry.includes('->')) {
      const parsed = orgSite(entry);
      if (parsed) sites.add(parsed);
    }
  });
  migratedCache = { raw, sites };
  return sites;
}

/**
 * Parses and caches valid dual-write source entries keyed by the raw configuration value.
 * @param {string[]|string|undefined} raw Raw HLX6_DUAL_WRITES configuration.
 * @returns {Set<string>} Normalized dual-write source org/site keys.
 * @throws {Error} If HLX6_DUAL_WRITES cannot be parsed.
 */
function getDualWriteSources(raw) {
  if (dualWriteCache.raw === raw) return dualWriteCache.sources;
  const sources = new Set();
  entries(raw, 'HLX6_DUAL_WRITES').forEach((entry) => {
    if (typeof entry !== 'string') return;
    const [from, to, ...rest] = entry.split('->');
    const source = orgSite(from);
    if (!rest.length && source && (to === undefined || !!orgSite(to))) {
      sources.add(source);
    }
  });
  dualWriteCache = { raw, sources };
  return sources;
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
  const migrated = getMigratedSites(env.HLX6_MIGRATED_SITES);
  const dualWrite = getDualWriteSources(env.HLX6_DUAL_WRITES);
  return migrated.has(key) && !dualWrite.has(key);
}
