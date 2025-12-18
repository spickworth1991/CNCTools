// src/app/api/travel/projects/[id]/photos/route.js
import { getJson, putJson, putBytes } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function guessExt(file) {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();

  if (name.endsWith(".png") || type.includes("png")) return "png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || type.includes("jpeg") || type.includes("jpg")) return "jpg";
  return ""; // unknown
}

export async function POST(req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const metaKey = `travel/projects/${id}/meta.json`;
  const meta = await getJson(metaKey);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });
  if (meta.status !== "open") return Response.json({ error: "Project is closed" }, { status: 400 });

  const fd = await req.formData();
  const file = fd.get("file");
  const title = String(fd.get("title") || "").trim();
  const description = String(fd.get("description") || "").trim();

  if (!file || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });

  // Only allow formats we can embed into PDF on the server
  const ext = guessExt(file);
  if (!ext) {
    return Response.json(
      { error: "Please upload JPG/JPEG/PNG. (HEIC is fine if your browser converts it before upload.)" },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const photoId = crypto.randomUUID(); // ✅ Edge-safe
  const key = `travel/projects/${id}/photos/${photoId}.${ext}`;

  const contentType =
    ext === "png" ? "image/png" :
    "image/jpeg";

  await putBytes(key, bytes, contentType);

  const photos = Array.isArray(meta.photos) ? meta.photos : [];
  photos.push({
    photoId,
    key,
    title,
    description,
    uploadedAt: nowIso(),
    contentType, // store what we believe it is
  });

  meta.photos = photos;
  meta.updatedAt = nowIso();

  await putJson(metaKey, meta);

  return Response.json({ ok: true });
}
