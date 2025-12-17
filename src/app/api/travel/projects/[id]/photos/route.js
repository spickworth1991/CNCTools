import { getJson, putJson, putBytes } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

export async function POST(request, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const metaKey = `travel/projects/${id}/meta.json`;
  const meta = await getJson(metaKey);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });
  if (meta.status !== "open") return Response.json({ error: "Project is closed" }, { status: 400 });

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "");

  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!file || typeof file === "string") return Response.json({ error: "File is required" }, { status: 400 });

  const filename = String(file.name || "upload");
  const lower = filename.toLowerCase();
  const contentType = String(file.type || "");

  const ok =
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    contentType === "image/jpeg" ||
    contentType === "image/png";

  if (!ok) {
    return Response.json({ error: "Only JPG/JPEG/PNG are supported (HEIC should be converted client-side)." }, { status: 400 });
  }

  const photoId = newId();
  const ext = lower.endsWith(".png") ? "png" : "jpg";
  const photoKey = `travel/projects/${id}/photos/${photoId}.${ext}`;

  const ab = await file.arrayBuffer();
  await putBytes(photoKey, new Uint8Array(ab), contentType || (ext === "png" ? "image/png" : "image/jpeg"));

  const entry = {
    photoId,
    key: photoKey,
    title,
    description,
    uploadedAt: nowIso()
  };

  meta.photos = Array.isArray(meta.photos) ? meta.photos : [];
  meta.photos.push(entry);

  await putJson(metaKey, meta);

  return Response.json({ ok: true, photoId });
}
