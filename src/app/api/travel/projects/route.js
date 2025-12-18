// src/app/api/travel/projects/route.js
import { getJson, putJson, listKeys } from "../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function safeName(s) {
  return String(s || "").trim();
}

function makeId() {
  // Edge-safe UUID
  return crypto.randomUUID();
}

export async function GET() {
  const keys = await listKeys("travel/projects/");
  const metaKeys = keys.filter((k) => k.endsWith("/meta.json"));

  const projects = [];
  for (const k of metaKeys) {
    const m = await getJson(k);
    if (m) projects.push(m);
  }

  // newest first
  projects.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  return Response.json({ projects });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const serviceReportNumber = safeName(body.serviceReportNumber);
  const customerName = safeName(body.customerName);
  const travelStart = safeName(body.travelStart);

  // IMPORTANT: travelEnd is NOT chosen here anymore
  if (!serviceReportNumber) return Response.json({ error: "Service Report # is required" }, { status: 400 });
  if (!customerName) return Response.json({ error: "Customer Name is required" }, { status: 400 });
  if (!travelStart) return Response.json({ error: "Travel Start is required" }, { status: 400 });

  const projectId = makeId();
  const metaKey = `travel/projects/${projectId}/meta.json`;

  const meta = {
    projectId,
    serviceReportNumber,
    customerName,
    travelStart,
    travelEnd: "", // set at close time
    status: "open",
    photos: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    closedAt: "",
    pdfKey: "",
  };

  await putJson(metaKey, meta);

  return Response.json({ ok: true, projectId });
}
