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

    // NEW
    const receiptDate = String(fd.get("receiptDate") || "").trim(); // "YYYY-MM-DD" preferred
    const originalName = String(file?.name || "").trim();

    // Existing fields (you already have these in UI)
    const amount = String(fd.get("amount") || "").trim();
    const companyChargedRaw = String(fd.get("companyCharged") || "").trim();
    const companyCharged = companyChargedRaw === "true" || companyChargedRaw === "1" || companyChargedRaw === "yes";

    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }
    if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
    if (!amount) return Response.json({ error: "Amount is required" }, { status: 400 });

    if (isHeicLike(file)) {
      return Response.json(
        { error: "HEIC/HEIF must be converted in the browser before upload." },
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
        { error: "WEBP isn’t supported for PDF generation yet. Please upload JPG/PNG." },
        { status: 400 }
      );
    } else {
      return Response.json(
        { error: "Unsupported image format. Please upload JPG/PNG (HEIC ok only if auto-converted client-side)." },
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
      amount: Number(amount),
      companyCharged,
      receiptDate: receiptDate || "",      // ✅ store user-provided date
      originalName: originalName || "",    // ✅ store filename
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
