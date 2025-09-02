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
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

import getS3Config from './utils.js';

function buildInput({ bucket, org, key }) {
  return { Bucket: bucket, Key: `${org}/${key}` };
}

export default async function getObject(env, daCtx) {
  const config = getS3Config(env);
  const client = new S3Client(config);

  const input = buildInput(daCtx);
  const command = new GetObjectCommand(input);

  try {
    const resp = await client.send(command);
    return {
      body: resp.Body,
      status: resp.$metadata.httpStatusCode,
      contentType: resp.ContentType,
      contentLength: resp.ContentLength,
    };
  } catch (e) {
    return { body: '', status: 404 };
  }
}
