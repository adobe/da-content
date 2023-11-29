export default function getS3Config(env) {
  return {
    region: 'auto',
    endpoint: env.S3_DEF_URL,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  };
}
