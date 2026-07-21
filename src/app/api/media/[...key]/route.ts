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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join("/");

  if (!objectKey || objectKey.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  // Scrapers (Facebook/OpenGraph, some email clients) don't render WebP, which
  // is how we store uploads. `?format=jpeg` transcodes on the fly so shared
  // links show the real flyer instead of falling back to a page image.
  const wantJpeg = new URL(request.url).searchParams.get("format") === "jpeg";

  try {
    const s3 = createClient();
    const response = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    );

    if (!response.Body) {
      return new Response("Not found", { status: 404 });
    }

    if (wantJpeg) {
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as unknown as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const jpeg = await sharp(Buffer.concat(chunks)).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
      // sharp's output Buffer is backed by a SharedArrayBuffer, which undici's
      // Response rejects ("SharedArrayBuffer is not allowed"). Copy into a fresh,
      // unshared Uint8Array before responding.
      const body = new Uint8Array(jpeg);
      return new Response(body, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": body.byteLength.toString(),
        },
      });
    }

    const stream = response.Body as ReadableStream;
    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": response.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": response.ContentLength?.toString() ?? "",
      },
    });
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") {
      return new Response("Not found", { status: 404 });
    }
    console.error("[media]", objectKey, err);
    return new Response("Internal error", { status: 500 });
  }
}
