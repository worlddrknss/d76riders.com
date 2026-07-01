/**
 * Converts a raw S3/Minio URL stored in DB into a proxied /api/media/... path
 * that the browser can actually load (avoids private bucket 403s).
 */

const bucket = process.env.S3_BUCKET ?? "d76riders-uploads";
const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? "";

export function mediaUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";

  // Already proxied
  if (rawUrl.startsWith("/api/media/")) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    const origin = publicEndpoint ? new URL(publicEndpoint).origin : null;

    // Only rewrite URLs that belong to our configured S3 endpoint
    if (origin && parsed.origin !== origin) {
      return rawUrl;
    }

    const stripped = parsed.pathname.replace(/^\//, "");
    // URL format: /<bucket>/<key>
    if (stripped.startsWith(`${bucket}/`)) {
      const key = stripped.slice(bucket.length + 1);
      return `/api/media/${key}`;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}
