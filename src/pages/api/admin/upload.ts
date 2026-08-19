import type { APIRoute } from "astro";
import { put } from "@vercel/blob";
import { validateUpload, sanitizeDimension } from "../../../lib/promos/image";

export const prerender = false;

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { ok: false, error: "Expected a file upload" });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json(400, { ok: false, error: "No file provided" });

  // Validated server-side rather than trusting the browser's accept attribute.
  const problem = validateUpload(file.type, file.size);
  if (problem) return json(400, { ok: false, error: problem });

  const width = sanitizeDimension(form.get("width"));
  const height = sanitizeDimension(form.get("height"));
  if (width === null || height === null) return json(400, { ok: false, error: "Missing image dimensions" });

  try {
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const blob = await put(`promos/${crypto.randomUUID()}.${extension}`, file, {
      access: "public",
      contentType: file.type,
    });
    return json(200, { ok: true, url: blob.url, width, height });
  } catch (error) {
    console.error("[admin] image upload failed:", error);
    return json(500, { ok: false, error: "Upload failed. Try again." });
  }
};
