export const MAX_LOGO_BYTES = 512 * 1024;

export type ImageKind = { ext: "png" | "jpg" | "webp"; contentType: "image/png" | "image/jpeg" | "image/webp" };

/**
 * Detects the image type from the file's magic bytes; the browser-supplied
 * type and file name are not trusted. SVG is deliberately not accepted
 * (it can carry scripts).
 */
export function detectImage(bytes: Uint8Array): ImageKind | null {
  const b = (i: number) => bytes[i];
  if (bytes.length >= 8 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 && b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a) {
    return { ext: "png", contentType: "image/png" };
  }
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", contentType: "image/webp" };
  return null;
}

export function validateLogo(bytes: Uint8Array): { ok: true; kind: ImageKind } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "Choose an image to upload." };
  if (bytes.length > MAX_LOGO_BYTES) return { ok: false, error: "The logo must be 512 KB or smaller." };
  const kind = detectImage(bytes);
  return kind ? { ok: true, kind } : { ok: false, error: "Upload a PNG, JPEG or WebP image." };
}
