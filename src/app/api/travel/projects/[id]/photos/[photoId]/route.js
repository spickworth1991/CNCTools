// src/app/api/travel/projects/[id]/photos/[photoId]/route.js
// - GET: returns the photo bytes (used for previews)
// - DELETE: deletes the photo object and removes it from meta.json

import { getJson, putJson, getBytes, deleteKey } from "../../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    const photoId = params?.photoId;
    if (!id) return new Response("Missing id", { status: 400 });
    if (!photoId) return new Response("Missing photoId", { status: 400 });

    const meta = await getJson(`travel/projects/${id}/meta.json`);
    if (!meta) return new Response("Project not found", { status: 404 });

    const photos = Array.isArray(meta.photos) ? meta.photos : [];
    const photo = photos.find((p) => String(p.photoId) === String(photoId));
    if (!photo?.key) return new Response("Photo not found", { status: 404 });

    const got = await getBytes(photo.key);
    if (!got?.bytes) return new Response("Photo not found", { status: 404 });

    return new Response(got.bytes, {
      headers: {
        "content-type": photo.contentType || got.contentType || "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return new Response(String(err?.message || err), { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const id = params?.id;
    const photoId = params?.photoId;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    if (!photoId) return Response.json({ error: "Missing photoId" }, { status: 400 });

    const metaKey = `travel/projects/${id}/meta.json`;
    const meta = await getJson(metaKey);
    if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

    const photos = Array.isArray(meta.photos) ? meta.photos : [];
    const idx = photos.findIndex((p) => String(p.photoId) === String(photoId));
    if (idx === -1) return Response.json({ error: "Photo not found" }, { status: 404 });

    const photo = photos[idx];

    // delete the underlying stored object (ignore if missing)
    if (photo?.key) {
      try {
        await deleteKey(photo.key);
      } catch {
        // swallow
      }
    }

    photos.splice(idx, 1);
    meta.photos = photos;
    meta.updatedAt = nowIso();

    await putJson(metaKey, meta);

    return Response.json({ ok: true, deleted: { photoId } });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const id = params?.id;
    const photoId = params?.photoId;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    if (!photoId) return Response.json({ error: "Missing photoId" }, { status: 400 });

    const metaKey = `travel/projects/${id}/meta.json`;
    const meta = await getJson(metaKey);
    if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

    const photos = Array.isArray(meta.photos) ? meta.photos : [];
    const idx = photos.findIndex((p) => String(p?.photoId || "") === String(photoId));
    if (idx < 0) return Response.json({ error: "Photo not found" }, { status: 404 });

    const p = { ...photos[idx] };

    // Editable fields (keep old values if not provided)
    if ("title" in body) p.title = String(body.title || "").trim();
    if ("description" in body) p.description = String(body.description || "").trim();

    if ("receiptDate" in body) {
      p.receiptDate = String(body.receiptDate || "").trim();
    }

    if ("companyCharged" in body) {
      const v = body.companyCharged;
      p.companyCharged = v === true || v === "true" || v === 1 || v === "1";
    }

    if ("amount" in body) {
      const raw = String(body.amount || "").trim();
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return Response.json({ error: "Amount must be a valid non-negative number" }, { status: 400 });
      }
      p.amount = n;
    }

    // Title is still required
    if (!String(p.title || "").trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    photos[idx] = p;
    meta.photos = photos;
    meta.updatedAt = nowIso();

    await putJson(metaKey, meta);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
