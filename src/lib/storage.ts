import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

// Dev-mode storage: files land in public/uploads and are served directly
// by Next.js. Swap this for Supabase Storage / S3 signed URLs in
// production — nothing else in the app needs to change, callers only
// ever see the returned URL.
export async function saveBillPhoto(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Photo must be a JPEG, PNG or WebP image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo is too large (max 8MB).");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  return `/uploads/${filename}`;
}
