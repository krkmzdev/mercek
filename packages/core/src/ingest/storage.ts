import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Object storage abstraction (§3: Cloudflare R2 via the S3 API). */
export interface ObjectStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(keys: string[]): Promise<void>;
  presignedPutUrl(key: string, contentType: string, expiresInSec?: number): Promise<string>;
  presignedGetUrl(key: string, expiresInSec?: number): Promise<string>;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

const DEFAULT_EXPIRY = 900; // 15 min

/** Create an R2-backed {@link ObjectStorage}. R2 speaks the S3 API. */
export function createR2Storage(config: R2Config): ObjectStorage {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const bucket = config.bucket;

  return {
    async put(key, bytes, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }),
      );
    },
    async delete(keys) {
      if (keys.length === 0) return;
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    },
    presignedPutUrl(key, contentType, expiresInSec = DEFAULT_EXPIRY) {
      return getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
        { expiresIn: expiresInSec },
      );
    },
    presignedGetUrl(key, expiresInSec = DEFAULT_EXPIRY) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: expiresInSec,
      });
    },
  };
}
