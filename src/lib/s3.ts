import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function deleteFilesByUrls(urls: Array<string | null | undefined>): Promise<void> {
  for (const url of urls) {
    await deleteFileByUrl(url);
  }
}
