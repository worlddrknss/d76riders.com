import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

import { mapWithConcurrency } from "@/lib/concurrency";

const bucket = process.env.S3_BUCKET ?? "d76riders-uploads";
const endpoint = process.env.S3_ENDPOINT;
const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? endpoint;

const s3Config = {
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
};

function createClient() {
  return new S3Client({
    ...s3Config,
    endpoint,
    // AWS SDK v3 (>= 3.729) defaults to sending a CRC32 checksum with
    // aws-chunked content-encoding on PutObject. MinIO (and some other
    // S3-compatible stores) can't process that trailer and the upload HANGS.
    // Only checksum when the operation actually requires it — restores the
    // pre-3.729 behaviour MinIO expects.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    // Never let a stalled connection hang an upload forever.
    requestHandler: new NodeHttpHandler({ connectionTimeout: 5_000, requestTimeout: 30_000 }),
  });
}

export function isS3Configured(): boolean {
  return Boolean(
    endpoint &&
      publicEndpoint &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!isS3Configured()) {
    throw new Error("S3 storage is not configured.");
  }

  const s3 = createClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  // Return proxied path so browser never hits private bucket directly
  return `/api/media/${key}`;
}

export function urlToKey(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  // Handle proxied /api/media/<key> paths (new format)
  if (url.startsWith("/api/media/")) {
    return url.slice("/api/media/".length);
  }

  try {
    const parsed = new URL(url);
    const configuredPublicOrigin = publicEndpoint ? new URL(publicEndpoint).origin : null;
    if (configuredPublicOrigin && parsed.origin !== configuredPublicOrigin) {
      return null;
    }

    const { pathname } = parsed;
    const stripped = pathname.replace(/^\//, "");
    if (stripped.startsWith(`${bucket}/`)) {
      return stripped.slice(bucket.length + 1);
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (!isS3Configured()) {
    return;
  }

  const s3 = createClient();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function deleteFileByUrl(url: string | null | undefined): Promise<void> {
  const key = urlToKey(url);
  if (!key) {
    return;
  }

  await deleteFile(key);
}

/**
 * Best-effort cleanup of a set of stored files.
 *
 * Bounded rather than sequential: deleting a ride's gallery was one round trip
 * per photo, in series. Bounded rather than a bare Promise.all: a large gallery
 * would otherwise open a connection per object at once.
 *
 * Per-file failures are logged and skipped rather than thrown. Every caller
 * runs this *after* the authoritative database change, so throwing would both
 * abandon the remaining files and surface an error for work that already
 * succeeded — leaving more orphans than it reports.
 */
export async function deleteFilesByUrls(urls: Array<string | null | undefined>): Promise<void> {
  await mapWithConcurrency(urls, 8, async (url) => {
    try {
      await deleteFileByUrl(url);
    } catch (error) {
      console.error("[s3] failed to delete", url, error);
    }
  });
}

export type StoredObject = { key: string; lastModified: Date | null; size: number };

/**
 * Every object in the bucket, with the metadata an orphan scan needs.
 *
 * `lastModified` matters: a scan races every upload in flight, and an object
 * written a second ago has not had time to be referenced by anything. Without
 * an age to check against, cleanup would eventually eat a photo out from under
 * someone mid-post.
 */
export async function listAllObjects(prefix?: string): Promise<StoredObject[]> {
  if (!isS3Configured()) return [];
  const client = createClient();
  const objects: StoredObject[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );
    for (const obj of response.Contents ?? []) {
      if (!obj.Key) continue;
      objects.push({
        key: obj.Key,
        lastModified: obj.LastModified ?? null,
        size: obj.Size ?? 0,
      });
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

export async function listAllKeys(prefix?: string): Promise<string[]> {
  return (await listAllObjects(prefix)).map((obj) => obj.key);
}
