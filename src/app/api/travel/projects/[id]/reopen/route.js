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

    if (meta.status !== "closed") {
      return Response.json({ error: "Only closed projects can be reopened." }, { status: 400 });
    }

    meta.status = "open";
    meta.reopenedAt = nowIso();
    meta.updatedAt = nowIso();

    // Clear “closed” fields so it behaves like a normal open project again
    meta.closedAt = "";
    meta.pdfKey = "";

    await putJson(metaKey, meta);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
