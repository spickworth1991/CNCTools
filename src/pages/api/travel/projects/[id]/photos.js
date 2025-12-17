function safeText(v) {
  return String(v || "").trim();
}

export async function onRequestPost(context) {
  try {
    const { CNCTOOLS_BUCKET } = context.env;
    const id = context.params.id;

    const metaKey = `travel/projects/${id}/meta.json`;
    const metaObj = await CNCTOOLS_BUCKET.get(metaKey);
    if (!metaObj) throw new Error("Project not found");

    const meta = await metaObj.json();
    if (meta.status !== "open") throw new Error("Project is closed");

    const form = await context.request.formData();
    const file = form.get("file");
    const title = safeText(form.get("title"));
    const description = safeText(form.get("description"));

    if (!file || typeof file === "string") throw new Error("Missing file");
    if (!title) throw new Error("Title is required");

    // Server only supports PDF embedding for jpg/png (we convert HEIC client-side)
    const contentType = file.type || "application/octet-stream";
    const name = safeText(file.name).toLowerCase();

    const isJpg = contentType === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
    const isPng = contentType === "image/png" || name.endsWith(".png");

    if (!isJpg && !isPng) {
      throw new Error("Upload must be JPG/JPEG/PNG (HEIC is supported via auto-conversion in the browser).");
    }

    const photoId = crypto.randomUUID();
    const ext = isPng ? "png" : "jpg";
    const key = `travel/projects/${id}/photos/${photoId}.${ext}`;

    const bytes = await file.arrayBuffer();

    await CNCTOOLS_BUCKET.put(key, bytes, {
      httpMetadata: { contentType: isPng ? "image/png" : "image/jpeg" }
    });

    meta.photos = Array.isArray(meta.photos) ? meta.photos : [];
    meta.photos.push({
      photoId,
      title,
      description,
      key,
      contentType: isPng ? "image/png" : "image/jpeg",
      uploadedAt: new Date().toISOString()
    });

    await CNCTOOLS_BUCKET.put(metaKey, JSON.stringify(meta, null, 2), {
      httpMetadata: { contentType: "application/json" }
    });

    return new Response(JSON.stringify({ ok: true, photoId }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
