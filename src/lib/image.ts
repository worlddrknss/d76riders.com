import sharp from "sharp";

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 80;

/**
 * Optimizes an uploaded image: converts to WebP, resizes if oversized,
 * and strips metadata. Returns the processed buffer and content type.
 */
export async function optimizeImage(
  buffer: Buffer,
): Promise<{ data: Buffer; contentType: string; ext: string }> {
  const data = await sharp(buffer)
    .rotate() // auto-rotate based on EXIF
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  return { data, contentType: "image/webp", ext: "webp" };
}
