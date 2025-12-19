// src/app/api/travel/projects/[id]/photos/route.js
import { getJson, putJson, putBytes } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function isPng(bytes) {
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
  return bytes?.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes) {
  return (
    bytes?.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
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

function parseMoneyToCents(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function parseBool(v) {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes" || s === "on";
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

    // NEW: amount + companyCharged
    const amountCents = parseMoneyToCents(fd.get("amount"));
    const companyCharged = parseBool(fd.get("companyCharged"));

    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }
    if (!title) return Response.json({ error: "Title is required" }, { status: 400 });

    if (amountCents == null) {
      return Response.json({ error: "Amount is required (e.g. 12.34)" }, { status: 400 });
    }

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

    let ext = "";
    let contentType = "";

    if (isPng(bytes)) {
      ext = "png";
      contentType = "image/png";
    } else if (isJpeg(bytes)) {
      ext = "jpg";
      contentType = "image/jpeg";
    } else if (isWebp(bytes)) {
      return Response.json(
        { error: "WEBP isn’t supported yet for PDF generation. Please re-upload as JPG/PNG." },
        { status: 400 }
      );
    } else {
      return Response.json(
        { error: "Unsupported image format. Please upload a normal phone photo as JPG/PNG." },
        { status: 400 }
      );
    }

    const photoId = crypto.randomUUID();
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

      // Original filename for display purposes
      originalName: String(file?.name || ""),

      amountCents,
      companyCharged,
    });


    meta.photos = photos;
    meta.updatedAt = nowIso();

    await putJson(metaKey, meta);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
