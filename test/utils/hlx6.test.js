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
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { expect } from 'chai';
import isHlx6Site from '../../src/utils/hlx6.js';
import { Nock } from '../utils.js';

describe('isHlx6Site', () => {
  let nock;
  let values;
  let registry;
  let env;
  let writes;

  beforeEach(() => {
    nock = new Nock();
    values = new Map();
    writes = [];
    registry = {
      get: async (key) => values.get(key) ?? null,
      put: async (key, value, options) => {
        writes.push([key, value, options]);
        values.set(key, value);
      },
    };
    env = { DA_SITE_BACKENDS: registry };
  });

  afterEach(() => nock.done());

  it('does not access the registry for incomplete org/site pairs', async () => {
    registry.get = async () => {
      throw new Error('Must not look up an incomplete site');
    };
    expect(await Promise.all([
      isHlx6Site(env, undefined, 'site'),
      isHlx6Site(env, 'org', undefined),
    ])).to.deep.equal([false, false]);
    expect(writes).to.deep.equal([]);
  });

  it('reads both cached backends with normalized keys and observes manual changes', async () => {
    values.set('org/site', ' HLX6\n');
    expect(await isHlx6Site(env, 'ORG', 'SITE')).to.equal(true);
    values.set('org/site', ' DA\n');
    expect(await isHlx6Site(env, 'org', 'site')).to.equal(false);
    values.set('org/site', 'hlx6');
    expect(await isHlx6Site(env, 'org', 'site')).to.equal(true);
    expect(writes).to.deep.equal([]);
  });

  it('probes and caches a missing site even with a legacy dual-write flag', async () => {
    env.HLX6_DUAL_WRITES = 'org/site';
    nock('https://admin.hlx.page').get('/ping/org/site')
      .reply(200, '', { 'x-api-upgrade-available': 'true' });
    expect(await isHlx6Site(env, 'ORG', 'SITE')).to.equal(true);
    expect(await isHlx6Site(env, 'org', 'site')).to.equal(true);
    expect(writes).to.deep.equal([['org/site', 'hlx6', undefined]]);
  });

  [200, 404].forEach((status) => {
    it(`persists a negative ping result (${status}) instead of probing it again`, async () => {
      nock('https://admin.hlx.page').get('/ping/org/site').reply(status);
      expect(await isHlx6Site(env, 'org', 'site')).to.equal(false);
      expect(await isHlx6Site(env, 'org', 'site')).to.equal(false);
      expect(writes).to.deep.equal([['org/site', 'da', status === 404 ? { expirationTtl: 300 } : undefined]]);
    });
  });

  it('keeps concurrent cold requests independent when one probe is cancelled', async () => {
    nock('https://admin.hlx.page').get('/ping/org/site')
      .replyWithError('First request cancelled');
    nock('https://admin.hlx.page').get('/ping/org/site')
      .reply(200, '', { 'x-api-upgrade-available': 'true' });
    const results = await Promise.allSettled([
      isHlx6Site(env, 'org', 'site'),
      isHlx6Site(env, 'ORG', 'SITE'),
    ]);
    expect(results[0].status).to.equal('rejected');
    expect(results[1]).to.deep.equal({ status: 'fulfilled', value: true });
    expect(writes).to.have.length(1);
  });

  it('uses the configured probe base URL', async () => {
    env.HLX_ADMIN = 'https://ping.example.com/';
    nock('https://ping.example.com').get('/ping/org/site')
      .reply(200, '', { 'x-api-upgrade-available': 'true' });
    expect(await isHlx6Site(env, 'org', 'site')).to.equal(true);
  });

  [true, false].forEach((migrated) => {
    it(`returns the known backend (${migrated}) and logs a failed KV write`, async () => {
      registry.put = async () => {
        throw new Error('KV write limit');
      };
      nock('https://admin.hlx.page').get('/ping/org/site')
        .reply(200, '', migrated ? { 'x-api-upgrade-available': 'true' } : {});
      const errors = mock.method(console, 'error', () => {});
      try {
        expect(await isHlx6Site(env, 'org', 'site')).to.equal(migrated);
        expect(errors.mock.calls.map(({ arguments: args }) => args)).to.deep.equal([
          ['[hlx6] Failed to cache site backend', 'org/site', 'KV write limit'],
        ]);
        expect(writes).to.deep.equal([]);
      } finally {
        errors.mock.restore();
      }
    });
  });

  it('ignores mapped and malformed legacy dual-write configuration when reading KV', async () => {
    values.set('org/site', 'hlx6');
    env.HLX6_DUAL_WRITES = 'org/site -> other/target';
    expect(await isHlx6Site(env, 'ORG', 'SITE')).to.equal(true);
    env.HLX6_DUAL_WRITES = '["org/site"';
    expect(await isHlx6Site(env, 'org', 'site')).to.equal(true);
    values.set('org/site', 'da');
    expect(await isHlx6Site(env, 'org', 'site')).to.equal(false);
  });

  [302, 401, 403, 429, 500].forEach((status) => {
    it(`does not cache a failed probe (${status}) and permits a later retry`, async () => {
      nock('https://admin.hlx.page').get('/ping/org/site').reply(status);
      await assert.rejects(isHlx6Site(env, 'org', 'site'), /Site backend probe failed/);
      expect(writes).to.deep.equal([]);
      nock('https://admin.hlx.page').get('/ping/org/site')
        .reply(200, '', { 'x-api-upgrade-available': 'true' });
      expect(await isHlx6Site(env, 'org', 'site')).to.equal(true);
    });
  });

  it('surfaces transport failures without persisting a DA result', async () => {
    nock('https://admin.hlx.page').get('/ping/org/site').replyWithError('Connection reset');
    await assert.rejects(isHlx6Site(env, 'org', 'site'), /Connection reset/);
    expect(writes).to.deep.equal([]);
  });

  it('rejects missing bindings, invalid entries and KV read failures instead of assuming DA', async () => {
    await assert.rejects(isHlx6Site({}, 'org', 'site'), /Missing DA_SITE_BACKENDS/);
    values.set('org/site', 'invalid');
    await assert.rejects(isHlx6Site(env, 'org', 'site'), /Invalid site backend/);
    registry.get = async () => {
      throw new Error('KV read failed');
    };
    await assert.rejects(isHlx6Site(env, 'org', 'site'), /KV read failed/);
  });

  it('does not let a legacy dual-write flag bypass a missing registry binding', async () => {
    await assert.rejects(
      isHlx6Site({ HLX6_DUAL_WRITES: 'org/site' }, 'org', 'site'),
      /Missing DA_SITE_BACKENDS/,
    );
  });
});
