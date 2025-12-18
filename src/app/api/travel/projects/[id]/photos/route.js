// src/app/api/travel/projects/[id]/photos/route.js
import { getJson, putJson, putBytes } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function isPng(bytes) {
  // 89 50 4E 47 0D 0A 1A 0A
  return (
    bytes?.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpeg(bytes) {
  // FF D8 FF
  return bytes?.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes) {
  // "RIFF" .... "WEBP"
  return (
    bytes?.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50    // P
  );
}

function isHeicLike(file) {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type.includes("image/heic") ||
    type.includes("image/heif") ||
    type.includes("heic") ||
    type.includes("heif")
  );
}

export async function POST(req, { params }) {
  try {
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

    // If HEIC reaches the server, it means client conversion didn't happen.
    if (isHeicLike(file)) {
      return Response.json(
        {
          error:
            "HEIC/HEIF must be converted in the browser before upload. On iPhone, choose 'Most Compatible' or keep the auto-convert enabled in the uploader.",
        },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Detect actual format from bytes (most reliable)
    let ext = "";
    let contentType = "";

    if (isPng(bytes)) {
      ext = "png";
      contentType = "image/png";
    } else if (isJpeg(bytes)) {
      ext = "jpg";
      contentType = "image/jpeg";
    } else if (isWebp(bytes)) {
      // We *could* store it, but pdf-lib can't embed WEBP.
      // Better: force client-side conversion so "Close + Generate PDF" always works.
      return Response.json(
        {
          error:
            "WEBP isn’t supported yet for PDF generation. Please re-upload as JPG/PNG (or we can add client-side auto-conversion).",
        },
        { status: 400 }
      );
    } else {
      return Response.json(
        {
          error:
            "Unsupported image format. Please upload a normal phone photo as JPG/PNG (HEIC is OK only if it auto-converts before upload).",
        },
        { status: 400 }
      );
    }

    const photoId = crypto.randomUUID(); // Edge-safe
    const key = `travel/projects/${id}/photos/${photoId}.${ext}`;

    await putBytes(key, bytes, contentType);

    const photos = Array.isArray(meta.photos) ? meta.photos : [];
    photos.push({
      photoId,
      key,
      title,
      description,
      uploadedAt: nowIso(),
      contentType,
      ext,
    });

    meta.photos = photos;
    meta.updatedAt = nowIso();

    await putJson(metaKey, meta);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
