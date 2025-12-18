// src/app/api/travel/projects/[id]/close/route.js
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getJson, putJson, getBytes, putBytes } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function safeName(s) {
  return String(s || "receipts").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

// Magic-byte detection (trust bytes, not filename)
function detectImageKind(bytes, contentType, key) {
  const ct = (contentType || "").toLowerCase();
  const k = (key || "").toLowerCase();

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes?.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  // JPEG signature: FF D8 ... FF D9
  if (bytes?.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  if (ct.includes("png") || k.endsWith(".png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg") || k.endsWith(".jpg") || k.endsWith(".jpeg")) return "jpg";

  return "unknown";
}

async function embedImageRobust(pdf, bytes, kindHint) {
  // Try what we think it is first, but ALWAYS fallback.
  const order =
    kindHint === "png" ? ["png", "jpg"] :
    kindHint === "jpg" ? ["jpg", "png"] :
    ["jpg", "png"];

  let lastErr = null;

  for (const kind of order) {
    try {
      if (kind === "png") return await pdf.embedPng(bytes);
      if (kind === "jpg") return await pdf.embedJpg(bytes);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Failed to embed image");
}

export async function POST(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const metaKey = `travel/projects/${id}/meta.json`;
  const meta = await getJson(metaKey);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });
  if (meta.status !== "open") return Response.json({ error: "Already closed" }, { status: 400 });

  const photos = Array.isArray(meta.photos) ? meta.photos : [];
  if (!photos.length) {
    return Response.json({ error: "Upload at least one photo before closing." }, { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // Cover page
  {
    const page = pdf.addPage([612, 792]);
    const margin = 50;
    let y = 760;

    const line = (label, value) => {
      page.drawText(`${label} ${value || ""}`, { x: margin, y, size: 12, font });
      y -= 18;
    };

    page.drawText("Travel Receipts", { x: margin, y, size: 20, font });
    y -= 30;

    line("Service Report:", meta.serviceReportNumber);
    line("Customer:", meta.customerName);
    // IMPORTANT: avoid unicode arrows; WinAnsi font can choke on them
    line("Travel Dates:", `${meta.travelStart} to ${meta.travelEnd}`);
    line("Photos:", String(photos.length));
    line("Generated:", nowIso());
  }

  // Image pages
  for (const p of photos) {
    const got = await getBytes(p.key);
    if (!got?.bytes) continue;

    const bytes = got.bytes;
    const kind = detectImageKind(bytes, p.contentType || got.contentType, p.key);

    if (kind === "unknown") {
      // If someone uploaded WEBP/PDF/etc, fail with a useful message
      return Response.json(
        { error: `Unsupported image format for "${p.title || p.key}". Please upload JPG/JPEG/PNG (HEIC is OK if your browser converts it).` },
        { status: 400 }
      );
    }

    const img = await embedImageRobust(pdf, bytes, kind);
    const page = pdf.addPage([612, 792]);

    const margin = 24;
    const maxW = 612 - margin * 2;
    const maxH = 792 - margin * 2;

    const { width, height } = img.scale(1);
    const scale = Math.min(maxW / width, maxH / height);

    const drawW = width * scale;
    const drawH = height * scale;
    const x = (612 - drawW) / 2;
    const y = (792 - drawH) / 2;

    page.drawImage(img, { x, y, width: drawW, height: drawH });
  }

  const pdfBytes = await pdf.save();
  const pdfKey = `travel/projects/${id}/pdf/${safeName(meta.serviceReportNumber)}.pdf`;

  await putBytes(pdfKey, pdfBytes, "application/pdf");

  meta.status = "closed";
  meta.closedAt = nowIso();
  meta.pdfKey = pdfKey;

  await putJson(metaKey, meta);

  return Response.json({
    ok: true,
    downloadUrl: `/api/travel/projects/${encodeURIComponent(id)}/pdf`,
  });
}
