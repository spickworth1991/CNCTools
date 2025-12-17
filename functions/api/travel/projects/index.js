export async function onRequestGet(context) {
  try {
    const { CNCTOOLS_BUCKET } = context.env;
    const prefix = "travel/projects/";
    const listed = await CNCTOOLS_BUCKET.list({ prefix });

    const metaKeys = (listed.objects || [])
      .map((o) => o.key)
      .filter((k) => k.endsWith("/meta.json"));

    const metas = [];
    for (const key of metaKeys) {
      const obj = await CNCTOOLS_BUCKET.get(key);
      if (!obj) continue;
      const json = await obj.json();
      metas.push(json);
    }

    // Sort newest first
    metas.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return new Response(JSON.stringify({ projects: metas }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const { CNCTOOLS_BUCKET } = context.env;
    const body = await context.request.json();

    const serviceReportNumber = String(body?.serviceReportNumber || "").trim();
    const customerName = String(body?.customerName || "").trim();
    const travelStart = String(body?.travelStart || "").trim();
    const travelEnd = String(body?.travelEnd || "").trim();

    if (!serviceReportNumber) throw new Error("serviceReportNumber is required");
    if (!customerName) throw new Error("customerName is required");
    if (!travelStart) throw new Error("travelStart is required");
    if (!travelEnd) throw new Error("travelEnd is required");

    const projectId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const meta = {
      projectId,
      serviceReportNumber,
      customerName,
      travelStart,
      travelEnd,
      status: "open",
      createdAt,
      closedAt: null,
      photos: [],
      pdfKey: null
    };

    const metaKey = `travel/projects/${projectId}/meta.json`;
    await CNCTOOLS_BUCKET.put(metaKey, JSON.stringify(meta, null, 2), {
      httpMetadata: { contentType: "application/json" }
    });

    return new Response(JSON.stringify({ ok: true, projectId }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
