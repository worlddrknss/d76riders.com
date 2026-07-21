/**
 * Converts a raw S3/Minio URL stored in DB into a proxied /api/media/... path
 * that the browser can actually load (avoids private bucket 403s).
 */

const bucket = process.env.S3_BUCKET ?? "d76riders-uploads";

/**
 * A media URL fit for an OpenGraph/social image. Our uploads are stored as WebP,
 * which Facebook and most link scrapers won't render. They also frequently strip
 * query strings and pick a decoder from the path extension — so a `.webp?format=
 * jpeg` URL fails. Route through `/api/og/<key>.jpg`: query-free and
 * `.jpg`-terminated, always transcoded to JPEG. Third-party URLs are left as-is.
 */
export function ogImageUrl(rawUrl: string | null | undefined): string | undefined {
  const url = mediaUrl(rawUrl);
  if (!url) return undefined;
  if (!url.startsWith("/api/media/")) return url;
  return `/api/og/${url.slice("/api/media/".length)}.jpg`;
}

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
