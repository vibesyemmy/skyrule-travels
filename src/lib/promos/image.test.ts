import { describe, it, expect } from "vitest";
import { validateUpload, MAX_UPLOAD_BYTES } from "./image";

describe("validateUpload", () => {
  it("accepts a JPEG within the size limit", () => {
    expect(validateUpload("image/jpeg", 1_000_000)).toBeNull();
  });

  it("accepts PNG", () => {
    expect(validateUpload("image/png", 1000)).toBeNull();
  });

  it("accepts WebP", () => {
    expect(validateUpload("image/webp", 1000)).toBeNull();
  });

  it("rejects SVG, which can carry script", () => {
    expect(validateUpload("image/svg+xml", 1000)).toBe("Only JPEG, PNG and WebP images are allowed");
  });

  it("rejects a PDF", () => {
    expect(validateUpload("application/pdf", 1000)).toBe("Only JPEG, PNG and WebP images are allowed");
  });

  it("rejects a file over the size limit", () => {
    expect(validateUpload("image/jpeg", MAX_UPLOAD_BYTES + 1)).toBe("Image must be 5MB or smaller");
  });

  it("accepts a file exactly at the limit", () => {
    expect(validateUpload("image/jpeg", MAX_UPLOAD_BYTES)).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateUpload("image/jpeg", 0)).toBe("Image is empty");
  });
});
