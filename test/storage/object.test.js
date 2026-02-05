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
import { Nock } from '../utils.js';
import getObject from '../../src/storage/object.js';

const S3_BUCKET_HOST = 'https://test-bucket.s3-test.local';
const S3_BASE = 'https://s3-test.local';

function createEnv() {
  return {
    AEM_BUCKET_NAME: 'test-bucket',
    S3_DEF_URL: S3_BASE,
    S3_ACCESS_KEY_ID: 'test-key',
    S3_SECRET_ACCESS_KEY: 'test-secret',
  };
}

describe('getObject', () => {
  /** @type {ReturnType<typeof Nock>} */
  let nock;

  beforeEach(() => {
    nock = new Nock().env();
  });

  afterEach(() => {
    nock.done();
  });

  describe('successful object retrieval', () => {
    it('returns object data when S3 call succeeds', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/.+/)
        .reply(200, 'test-content', { 'content-type': 'text/html' });

      const env = createEnv();
      const daCtx = { bucket: 'test-bucket', org: 'test-org', key: 'test-key' };

      const result = await getObject(env, daCtx);

      expect(result.status).to.equal(200);
      expect(result.contentType).to.equal('text/html');
      expect(result.body).to.be.ok;
    });

    it('handles different content types', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/.+/)
        .reply(200, 'image-data', { 'content-type': 'image/jpeg' });

      const env = createEnv();
      const daCtx = { bucket: 'test-bucket', org: 'test-org', key: 'image.jpg' };

      const result = await getObject(env, daCtx);

      expect(result.contentType).to.equal('image/jpeg');
      expect(result.status).to.equal(200);
    });
  });

  describe('error handling', () => {
    it('returns 404 when S3 call fails', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/.+/)
        .reply(404);

      const env = createEnv();
      const daCtx = { bucket: 'test-bucket', org: 'test-org', key: 'nonexistent-key' };

      const result = await getObject(env, daCtx);

      expect(result).to.deep.equal({ body: '', status: 404 });
    });

    it('returns 404 when S3 returns error', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/.+/)
        .replyWithError('Network error');

      const env = createEnv();
      const daCtx = { bucket: 'test-bucket', org: 'test-org', key: 'test-key' };

      const result = await getObject(env, daCtx);

      expect(result).to.deep.equal({ body: '', status: 404 });
    });
  });

  describe('input building', () => {
    it('fetches correct key (org/key)', async () => {
      nock.s3(S3_BUCKET_HOST)
        .get(/\/my-org\/site\/page\.html/)
        .reply(200, 'content', { 'content-type': 'text/html' });

      const env = createEnv();
      const daCtx = { bucket: 'test-bucket', org: 'my-org', key: 'site/page.html' };

      const result = await getObject(env, daCtx);

      expect(result.status).to.equal(200);
      expect(result.body).to.be.ok;
    });
  });
});
