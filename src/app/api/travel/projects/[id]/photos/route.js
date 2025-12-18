// src/app/api/travel/projects/[id]/photos/route.js
import { getJson, putJson, putBytes } from "../../../../../_cf";
import { randomUUID } from "crypto";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function extForType(ct) {
  const t = (ct || "").toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return ".jpg";
  if (t.includes("png")) return ".png";
  return "";
}

function isAllowedType(ct) {
  const t = (ct || "").toLowerCase();
  return t.includes("image/jpeg") || t.includes("image/jpg") || t.includes("image/png");
}

export async function POST(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const metaKey = `travel/projects/${id}/meta.json`;
    const meta = await getJson(metaKey);
    if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });
    if (meta.status !== "open") return Response.json({ error: "Project is closed" }, { status: 400 });

    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "");

    if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
    if (!file || typeof file === "string") return Response.json({ error: "Missing file" }, { status: 400 });

    const contentType = file.type || "application/octet-stream";
    if (!isAllowedType(contentType)) {
      return Response.json(
        { error: "Only JPG/JPEG/PNG are supported right now (HEIC must be converted before upload)." },
        { status: 400 }
      );
    }

    const photoId = randomUUID();
    const ext = extForType(contentType) || ".jpg"; // fallback
    const key = `travel/projects/${id}/photos/${photoId}${ext}`;

    const ab = await file.arrayBuffer();
    await putBytes(key, new Uint8Array(ab), contentType);

    const photos = Array.isArray(meta.photos) ? meta.photos : [];
    photos.push({
      photoId,
      key,
      title,
      description,
      uploadedAt: nowIso(),
      contentType,
      originalName: file.name || null
    });

    meta.photos = photos;
    meta.updatedAt = nowIso();

    await putJson(metaKey, meta);

    return Response.json({ ok: true, photoId });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
