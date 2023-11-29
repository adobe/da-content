import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import getS3Config from './utils';

function buildInput({ org, key }) {
  const Bucket = `${org}-content`;
  return { Bucket, Key: key };
}

export default async function getObject(env, daCtx) {
  const config = getS3Config(env);

  const client = new S3Client(config);

  const input = buildInput(daCtx);
  const command = new GetObjectCommand(input);
  const response = await client.send(command);

  return new Response(response.Body);
}
