const MAGIC: Record<string, { bytes: number[]; offset?: number }> = {
  png: { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  jpg: { bytes: [0xff, 0xd8, 0xff] },
  gif: { bytes: [0x47, 0x49, 0x46, 0x38] },
  webp: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
};

export function checkMagic(buf: Buffer, ext: string): boolean {
  const spec = MAGIC[ext];
  if (!spec) return false;
  const { bytes, offset = 0 } = spec;
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((value, index) => buf[offset + index] === value);
}
