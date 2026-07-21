import { GetObjectCommand, type GetObjectCommandOutput, S3Client } from "@aws-sdk/client-s3";
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
 * OpenGraph/social image endpoint. Uploads are stored as WebP, which Facebook and
 * most link scrapers can't render, so this transcodes to a baseline JPEG. The
 * public URL is a clean `<name>.jpg` (stored extension stripped) so no ".webp"
 * appears anywhere for extension-sniffing scrapers.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const raw = (await params).key.join("/");
  // Temporary: prove what scrapers (Facebook) actually receive from origin.
  console.log("[og-req]", (request.headers.get("user-agent") ?? "?").slice(0, 80), raw);

  if (!raw || raw.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  // Recover the stored object behind the `.jpg` URL: try the formats we store,
  // then the literal key.
  const base = raw.replace(/\.jpg$/i, "");
  const candidates = [`${base}.webp`, `${base}.png`, `${base}.jpeg`, `${base}.jpg`, base];

  try {
    const s3 = createClient();
    let response: GetObjectCommandOutput | null = null;
    for (const candidate of candidates) {
      try {
        response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: candidate }));
        break;
      } catch (err: unknown) {
        const code = (err as { name?: string }).name;
        if (code === "NoSuchKey" || code === "NotFound") continue;
        throw err;
      }
    }
    if (!response || !response.Body) {
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
        // Neutralise the app-router RSC Vary header some scrapers dislike.
        Vary: "Accept",
      },
    });
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") {
      return new Response("Not found", { status: 404 });
    }
    console.error("[og]", raw, err);
    return new Response("Internal error", { status: 500 });
  }
}
