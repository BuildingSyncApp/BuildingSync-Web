import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Object storage on Cloudflare R2 (S3-compatible). Replaces Supabase
// Storage for building documents. Chosen for cost: free egress + a 10 GB /
// 1M-writes free tier covers the document workload at current scale, and
// the bucket region is selectable for data-residency posture.
//
// Required env (set locally in .env, and in Vercel → Production):
//   R2_ACCOUNT_ID         Cloudflare account id (R2 endpoint host)
//   R2_ACCESS_KEY_ID      R2 API token access key
//   R2_SECRET_ACCESS_KEY  R2 API token secret
//   R2_BUCKET             bucket name (e.g. "buildingsync-documents")

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

export function isStorageConfigured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket);
}

// Lazily build the client so a missing env var surfaces as a clear error at
// call time (caught by the action) rather than a module-load crash.
let _client: S3Client | null = null;
function client(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error(
      "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.",
    );
  }
  if (!_client) {
    _client = new S3Client({
      region: "auto", // R2 ignores region; "auto" is the S3-API convention
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return _client;
}

// Upload an object. `key` is the full object path within the bucket.
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

// Delete an object. Used for orphan cleanup when the DB write fails after a
// successful upload. Never throws into the caller's happy path — callers
// wrap this in .catch(() => {}).
export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }));
}

// Presigned GET URL the browser can fetch the file from directly. Default
// TTL 1 hour, matching the prior Supabase signed-URL behaviour.
export async function getDownloadUrl(key: string, expiresInSeconds = 60 * 60): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket!, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}
