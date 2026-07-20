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
  // Fail CLOSED: a detected infection, or a scanner that was meant to run but
  // errored (ClamAV enabled-but-unreachable in prod), both block the upload.
  // Only an explicitly-disabled scanner (SKIPPED — e.g. local dev, mode "off")
  // lets the file through, so enabling scanning can never be silently bypassed
  // by the scanner simply being down.
  if (scanResult === "INFECTED" || scanResult === "ERROR") {
    const infected = scanResult === "INFECTED";
    try {
      await logMalwareAudit({
        source,
        contentType: file.type || null,
        fileSizeBytes: file.size,
        scanResult,
        actionTaken: "BLOCKED",
        deleted: false,
        details: infected ? `Blocked upload: ${file.name}` : `Blocked (scanner unavailable): ${file.name}`,
      });
    } catch {
      // Never block upload handling on audit logging failure.
    }

    throw new Error(
      infected
        ? "Upload blocked: malware detected in image."
        : "Uploads are temporarily unavailable — the malware scanner is unreachable. Please try again shortly.",
    );
  }

  try {
    await logMalwareAudit({
      source,
      contentType: file.type || null,
      fileSizeBytes: file.size,
      scanResult, // CLEAN, or SKIPPED when scanning is disabled
      actionTaken: "ALLOWED",
      deleted: false,
      details: scanResult === "SKIPPED"
        ? `Scan skipped (disabled): ${file.name}`
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
