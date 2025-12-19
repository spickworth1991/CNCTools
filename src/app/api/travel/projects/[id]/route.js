// src/app/api/travel/projects/[id]/route.js
import { getJson, deletePrefix } from "../../../_cf";

export const runtime = "edge";

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const metaKey = `travel/projects/${id}/meta.json`;
  const project = await getJson(metaKey);

  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  return Response.json({ project });
}

export async function DELETE(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  // Try to read meta if it exists; if it doesn't, we still delete the prefix.
  const metaKey = `travel/projects/${id}/meta.json`;
  const meta = await getJson(metaKey);

  // Safety: only allow deleting CLOSED projects if meta exists
  if (meta && String(meta.status || "").toLowerCase() !== "closed") {
    return Response.json({ error: "Only CLOSED projects can be deleted." }, { status: 400 });
  }

  const deletedCount = await deletePrefix(`travel/projects/${id}/`);
  return Response.json({ ok: true, deletedCount });
}
