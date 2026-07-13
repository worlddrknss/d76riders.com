import { checkMagic } from "@/lib/magic-bytes";
import { logMalwareAudit } from "@/lib/malware-audit";
import { scanForMalware } from "@/lib/malware-scan";

const IMAGE_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const allowedImageTypes = new Set<string>(Object.keys(IMAGE_MIME_TO_EXT));

export type SafeImageUpload = {
  buffer: Buffer;
  ext: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

export async function validateAndScanImageUpload(file: File, source: string): Promise<SafeImageUpload> {
  const ext = IMAGE_MIME_TO_EXT[file.type as keyof typeof IMAGE_MIME_TO_EXT];
  if (!ext) {
    throw new Error("Image must be a JPG, PNG, or WebP file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!checkMagic(buffer, ext)) {
    throw new Error("Image contents do not match the declared file type.");
  }

  const scanResult = await scanForMalware(buffer);
  if (scanResult === "INFECTED") {
    try {
      await logMalwareAudit({
        source,
        contentType: file.type || null,
        fileSizeBytes: file.size,
        scanResult: "INFECTED",
        actionTaken: "BLOCKED",
        deleted: false,
        details: `Blocked upload: ${file.name}`,
      });
    } catch {
      // Never block upload handling on audit logging failure.
    }

    throw new Error("Upload blocked: malware detected in image.");
  }

  try {
    await logMalwareAudit({
      source,
      contentType: file.type || null,
      fileSizeBytes: file.size,
      scanResult,
      actionTaken: "ALLOWED",
      deleted: false,
      details: scanResult === "ERROR"
        ? `Scanner unavailable/error for: ${file.name}`
        : `Scan clean: ${file.name}`,
    });
  } catch {
    // Never block upload handling on audit logging failure.
  }

  const contentType: SafeImageUpload["contentType"] = ext === "jpg"
    ? "image/jpeg"
    : ext === "png"
      ? "image/png"
      : "image/webp";

  return {
    buffer,
    ext,
    contentType,
  };
}
