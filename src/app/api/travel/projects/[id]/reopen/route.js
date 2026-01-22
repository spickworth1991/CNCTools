// src/app/api/travel/projects/[id]/reopen/route.js
import { getJson, putJson } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

export async function POST(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const metaKey = `travel/projects/${id}/meta.json`;
    const meta = await getJson(metaKey);
    if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

    // Be robust: allow reopen if it "looks closed" even if status is missing/old schema
    const status = String(meta.status || "").toLowerCase().trim();
    const looksClosed =
      status === "closed" ||
      Boolean(meta.closedAt) ||
      Boolean(meta.pdfKey) ||
      Boolean(meta.travelEnd);

    if (!looksClosed) {
      return Response.json({ error: "Only closed projects can be reopened." }, { status: 400 });
    }

    meta.status = "open";
    meta.reopenedAt = nowIso();
    meta.updatedAt = nowIso();

    // Clear “closed markers” so the project behaves like an open project everywhere
    delete meta.closedAt;
    delete meta.pdfKey;
    delete meta.travelEnd;     // ✅ IMPORTANT
    delete meta.closedAtIso;   // (if you ever add variants later)
    delete meta.pdfKeyEmail;   // (if you ever add variants later)

    await putJson(metaKey, meta);

    return Response.json({ ok: true, project: meta });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
