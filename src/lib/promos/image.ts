export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// SVG is deliberately excluded: it can carry script, and sanitising it is a
// different problem from sanitising promo copy.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message, or null when the upload is acceptable. */
export function validateUpload(contentType: string, byteSize: number): string | null {
  if (!ALLOWED_TYPES.includes(contentType)) return "Only JPEG, PNG and WebP images are allowed";
  if (byteSize === 0) return "Image is empty";
  if (byteSize > MAX_UPLOAD_BYTES) return "Image must be 5MB or smaller";
  return null;
}

/** Dimensions are measured in the browser, so clamp them to something sane. */
export function sanitizeDimension(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 20000) return null;
  return n;
}
