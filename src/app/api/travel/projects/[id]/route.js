// src/app/api/travel/projects/[id]/route.js
import { getJson, putJson } from "../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const meta = await getJson(`travel/projects/${id}/meta.json`);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

  return Response.json({ project: meta });
}

// Optional: if you ever want to edit project fields later
export async function PATCH(req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const metaKey = `travel/projects/${id}/meta.json`;
  const meta = await getJson(metaKey);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Only allow safe fields to update
  if (typeof body.customerName === "string") meta.customerName = body.customerName.trim();
  if (typeof body.serviceReportNumber === "string") meta.serviceReportNumber = body.serviceReportNumber.trim();

  // New fields (morning updates)
  if (typeof body.locationCity === "string") meta.locationCity = body.locationCity.trim();
  if (typeof body.locationState === "string") meta.locationState = body.locationState.trim();
  if (typeof body.travelStartDateTime === "string") meta.travelStartDateTime = body.travelStartDateTime;

  meta.updatedAt = nowIso();
  await putJson(metaKey, meta);

  return Response.json({ ok: true, project: meta });
}
