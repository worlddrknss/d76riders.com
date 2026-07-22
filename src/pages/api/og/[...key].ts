import type { NextApiRequest, NextApiResponse } from "next";

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

export const config = { api: { responseLimit: false } };

/**
 * OpenGraph/social image endpoint — deliberately a Pages-Router API route, not an
 * App-Router route handler. App routes get `Vary: rsc, next-router-*` stamped on
 * every response; the static site images Facebook happily scrapes have no such
 * header, and it's the only structural difference left between them. A Pages API
 * route returns a plain image response.
 *
 * Uploads are stored as WebP (unrenderable by most scrapers), so we transcode to
 * a baseline JPEG. The public URL is `<name>.jpg` (stored extension stripped) so
 * no ".webp" appears anywhere for extension-sniffing scrapers.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = req.query.key;
  const raw = Array.isArray(parts) ? parts.join("/") : (parts ?? "");

  if (!raw || raw.includes("..")) {
    res.status(404).send("Not found");
    return;
  }

  // Recover the stored object behind the `.jpg` URL: try the formats we store,
  // then the literal key.
  const base = raw.replace(/\.jpg$/i, "");
  const candidates = [`${base}.webp`, `${base}.png`, `${base}.jpeg`, `${base}.jpg`, base];

  try {
    const s3 = createClient();
    let object: GetObjectCommandOutput | null = null;
    for (const candidate of candidates) {
      try {
        object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: candidate }));
        break;
      } catch (err: unknown) {
        const code = (err as { name?: string }).name;
        if (code === "NoSuchKey" || code === "NotFound") continue;
        throw err;
      }
    }
    if (!object || !object.Body) {
      res.status(404).send("Not found");
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of object.Body as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    const jpeg = await sharp(Buffer.concat(chunks)).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Length", jpeg.length.toString());
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200).end(jpeg);
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") {
      res.status(404).send("Not found");
      return;
    }
    console.error("[og]", raw, err);
    res.status(500).send("Internal error");
  }
}
