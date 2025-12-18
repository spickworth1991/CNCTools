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

function isValidDateOnly(s) {
  // YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function normalizeDateTimeLocal(s) {
  // Accepts:
  // - "YYYY-MM-DDTHH:MM"
  // - "YYYY-MM-DDTHH:MM:SS"
  // Returns the same string if plausible; otherwise ""
  const v = String(s || "").trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) return v;
  return "";
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

  // Morning updates: location + start datetime
  const locationCity = safeName(body.locationCity);
  const locationState = safeName(body.locationState);

  // New preferred field
  let travelStartDateTime = normalizeDateTimeLocal(body.travelStartDateTime);

  // Back-compat: if UI still sends travelStart (date only), accept it
  const travelStart = safeName(body.travelStart);
  if (!travelStartDateTime && isValidDateOnly(travelStart)) {
    travelStartDateTime = `${travelStart}T00:00`;
  }

  // IMPORTANT: travelEnd is NOT chosen here anymore
  if (!serviceReportNumber) return Response.json({ error: "Service Report # is required" }, { status: 400 });
  if (!customerName) return Response.json({ error: "Customer Name is required" }, { status: 400 });

  // Require these new fields (per your morning plan)
  if (!locationCity) return Response.json({ error: "Location City is required" }, { status: 400 });
  if (!locationState) return Response.json({ error: "Location State is required" }, { status: 400 });
  if (!travelStartDateTime) return Response.json({ error: "Travel Start (date+time) is required" }, { status: 400 });

  const projectId = makeId();
  const metaKey = `travel/projects/${projectId}/meta.json`;

  const meta = {
    projectId,
    serviceReportNumber,
    customerName,

    // Keep travelStart for display/backward compatibility (date-only)
    travelStart: travelStart || travelStartDateTime.slice(0, 10),

    // New canonical start datetime (local form value)
    travelStartDateTime,

    // New location fields
    locationCity,
    locationState,

    // End chosen at close time
    travelEnd: "",
    travelEndDateTime: "",

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
