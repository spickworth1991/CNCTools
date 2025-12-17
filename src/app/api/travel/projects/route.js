import { listKeys, getJson, putJson } from "../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  // works in edge + node
  return crypto.randomUUID();
}

export async function GET() {
  const keys = await listKeys("travel/projects/");
  const metaKeys = keys.filter((k) => k.endsWith("/meta.json"));

  const projects = [];
  for (const k of metaKeys) {
    const meta = await getJson(k);
    if (meta) projects.push(meta);
  }

  // newest first
  projects.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  return Response.json({ projects });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const serviceReportNumber = String(body.serviceReportNumber || "").trim();
  const customerName = String(body.customerName || "").trim();
  const travelStart = String(body.travelStart || "").trim();
  const travelEnd = String(body.travelEnd || "").trim();

  if (!serviceReportNumber || !customerName || !travelStart || !travelEnd) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const projectId = newId();
  const meta = {
    projectId,
    serviceReportNumber,
    customerName,
    travelStart,
    travelEnd,
    status: "open",
    createdAt: nowIso(),
    closedAt: null,
    pdfKey: null,
    photos: []
  };

  await putJson(`travel/projects/${projectId}/meta.json`, meta);

  return Response.json({ ok: true, projectId });
}
