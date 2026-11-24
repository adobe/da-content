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
import isHlx6Site from '../../src/utils/hlx6.js';

describe('isHlx6Site', () => {
  it('returns false when migration variables are unset', () => {
    expect(isHlx6Site({}, 'org', 'site')).to.equal(false);
  });

  it('supports arrays, JSON arrays, and comma/newline-separated strings with normalization', () => {
    expect(isHlx6Site({ HLX6_MIGRATED_SITES: [' /ORG/Site/ '] }, 'org', 'site')).to.equal(true);
    expect(isHlx6Site({ HLX6_MIGRATED_SITES: '["org/site"]' }, 'ORG', 'SITE')).to.equal(true);
    expect(isHlx6Site({ HLX6_MIGRATED_SITES: 'other/one,\n org/site , third/two' }, 'org', 'site')).to.equal(true);
    // Repeated lookup with identical raw config hits the parsed cache
    expect(isHlx6Site({ HLX6_MIGRATED_SITES: '["org/site"]' }, 'org', 'site')).to.equal(true);
  });

  it('ignores non-string or malformed org/site entries in valid lists', () => {
    const env = {
      HLX6_MIGRATED_SITES: [null, 42, 'invalid', 'a/b/c', 'org/site -> target/site', 'org/site'],
      HLX6_DUAL_WRITES: [null, 'bad', 'org/site -> bad', 'org/site -> a -> b'],
    };
    expect(isHlx6Site(env, 'org', 'site')).to.equal(true);
  });

  it('excludes both plain and mapped dual-write sources, but not mapped targets', () => {
    expect(isHlx6Site({
      HLX6_MIGRATED_SITES: 'org/site',
      HLX6_DUAL_WRITES: 'org/site',
    }, 'org', 'site')).to.equal(false);

    expect(isHlx6Site({
      HLX6_MIGRATED_SITES: 'org/site',
      HLX6_DUAL_WRITES: 'org/site -> other/target',
    }, 'org', 'site')).to.equal(false);

    // Repeated lookup with identical raw dual-write config hits cache
    expect(isHlx6Site({
      HLX6_MIGRATED_SITES: 'org/site',
      HLX6_DUAL_WRITES: 'org/site -> other/target',
    }, 'org', 'site')).to.equal(false);

    expect(isHlx6Site({
      HLX6_MIGRATED_SITES: 'other/target',
      HLX6_DUAL_WRITES: 'org/site -> other/target',
    }, 'other', 'target')).to.equal(true);
  });

  it('throws on unsupported variable types, non-array JSON, or malformed JSON', () => {
    expect(() => isHlx6Site({ HLX6_MIGRATED_SITES: 123 }, 'org', 'site'))
      .to.throw('Invalid HLX6_MIGRATED_SITES');
    expect(() => isHlx6Site({ HLX6_MIGRATED_SITES: '{"org/site":true}' }, 'org', 'site'))
      .to.throw('Invalid HLX6_MIGRATED_SITES');
    expect(() => isHlx6Site({ HLX6_MIGRATED_SITES: '[123]' }, 'org', 'site')).to.not.throw();

    // JSON starting with '[' that parses to non-array cannot happen in valid JSON,
    // wait: '["a"]' is an array; test malformed JSON in both variables:
    expect(() => isHlx6Site({ HLX6_MIGRATED_SITES: '["org/site"' }, 'org', 'site'))
      .to.throw('Invalid JSON in HLX6_MIGRATED_SITES');
    expect(() => isHlx6Site({
      HLX6_MIGRATED_SITES: 'org/site',
      HLX6_DUAL_WRITES: '["org/site"',
    }, 'org', 'site')).to.throw('Invalid JSON in HLX6_DUAL_WRITES');
  });
});
