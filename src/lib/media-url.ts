/**
 * Converts a raw S3/Minio URL stored in DB into a proxied /api/media/... path
 * that the browser can actually load (avoids private bucket 403s).
 */

const bucket = process.env.S3_BUCKET ?? "d76riders-uploads";

export function mediaUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";

  // Already proxied
  if (rawUrl.startsWith("/api/media/")) return rawUrl;

  // Some imported rows contain a plain "bucket/key" or just "key".
  if (rawUrl.startsWith(`${bucket}/`)) {
    return `/api/media/${rawUrl.slice(bucket.length + 1)}`;
  }

  try {
    const parsed = new URL(rawUrl);
    const publicOrigin = process.env.S3_PUBLIC_ENDPOINT ? new URL(process.env.S3_PUBLIC_ENDPOINT).origin : null;
    const privateOrigin = process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : null;

    // Keep third-party media URLs (e.g. Unsplash) as-is.
    if (
      (publicOrigin && parsed.origin !== publicOrigin) &&
      (privateOrigin && parsed.origin !== privateOrigin)
    ) {
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
    const stripped = rawUrl.replace(/^\/+/, "");
    return stripped ? `/api/media/${stripped}` : rawUrl;
  }
}
