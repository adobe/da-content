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
import getS3Config from '../../src/storage/utils.js';

describe('getS3Config', () => {
  it('returns correct S3 configuration', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://test-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key',
    };

    const result = getS3Config(mockEnv);

    expect(result).to.deep.equal({
      region: 'auto',
      endpoint: 'https://test-s3-endpoint.com',
      credentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      },
    });
  });

  it('handles different environment configurations', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://prod-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'prod-access-key',
      S3_SECRET_ACCESS_KEY: 'prod-secret-key',
    };

    const result = getS3Config(mockEnv);

    expect(result.region).to.equal('auto');
    expect(result.endpoint).to.equal('https://prod-s3-endpoint.com');
    expect(result.credentials.accessKeyId).to.equal('prod-access-key');
    expect(result.credentials.secretAccessKey).to.equal('prod-secret-key');
  });

  it('always returns auto region', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://test-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key',
    };

    const result = getS3Config(mockEnv);

    expect(result.region).to.equal('auto');
  });

  it('structures credentials correctly', () => {
    const mockEnv = {
      S3_DEF_URL: 'https://test-s3-endpoint.com',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key',
    };

    const result = getS3Config(mockEnv);

    expect(result.credentials).to.have.property('accessKeyId');
    expect(result.credentials).to.have.property('secretAccessKey');
    expect(typeof result.credentials.accessKeyId).to.equal('string');
    expect(typeof result.credentials.secretAccessKey).to.equal('string');
  });
});
