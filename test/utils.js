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

// eslint-disable-next-line import/no-extraneous-dependencies
import nock from 'nock';

const ADMIN_BASE = 'https://admin.da.live';

/**
 * Nock helper for mocking HTTP in tests (helix-api-service style).
 * Call .env() to get a configured nock instance, then .admin() / .s3() to set up scopes.
 * Call .done() in afterEach to assert and clean up.
 */
export function Nock() {
  const scopes = [];
  let savedEnv;

  function nocker(baseUrl) {
    const scope = nock(baseUrl);
    scopes.push(scope);
    return scope;
  }

  nocker.env = (overrides = {}) => {
    savedEnv = { ...process.env };
    Object.assign(process.env, {
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'dummy-id',
      AWS_SECRET_ACCESS_KEY: 'dummy-key',
      ...overrides,
    });
    return nocker;
  };

  nocker.done = () => {
    if (savedEnv) {
      process.env = savedEnv;
    }
    try {
      scopes.forEach((s) => s.done());
    } finally {
      nock.cleanAll();
    }
  };

  /** Mock admin.da.live (getFromAdmin). */
  nocker.admin = () => nocker(ADMIN_BASE);

  /**
   * Mock S3 endpoint (getObject).
   * @param {string} baseUrl - e.g. 'https://s3-test.local'
   */
  nocker.s3 = (baseUrl) => nocker(baseUrl);

  nock.disableNetConnect();
  return nocker;
}
