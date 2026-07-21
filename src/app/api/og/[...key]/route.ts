import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const bucket = process.env.S3_BUCKET ?? "d76riders-uploads";

function createClient() {
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

/**
 * OpenGraph/social image endpoint. Uploads are stored as WebP, which Facebook
 * and most link scrapers can't render — and they often strip query strings, so
 * a `?format=jpeg` on the WebP URL isn't reliable either. This route lives at a
 * `.jpg`-terminated, query-free URL (`/api/og/<key>.jpg`) and always returns a
 * baseline JPEG transcode of the stored object, so scrapers get a format they
 * understand no matter how they normalise the URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  let objectKey = params ? (await params).key.join("/") : "";
  // The `.jpg` suffix is only there for the scrapers; the real object is the
  // stored (usually .webp) key underneath it.
  if (objectKey.endsWith(".jpg")) objectKey = objectKey.slice(0, -4);

  if (!objectKey || objectKey.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const s3 = createClient();
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    if (!response.Body) {
      return new Response("Not found", { status: 404 });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    const jpeg = await sharp(Buffer.concat(chunks)).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
    // sharp's output is backed by a SharedArrayBuffer, which undici's Response
    // rejects; copy into a fresh, unshared Uint8Array.
    const body = new Uint8Array(jpeg);
    return new Response(body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": body.byteLength.toString(),
      },
    });
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") {
      return new Response("Not found", { status: 404 });
    }
    console.error("[og]", objectKey, err);
    return new Response("Internal error", { status: 500 });
  }
}
