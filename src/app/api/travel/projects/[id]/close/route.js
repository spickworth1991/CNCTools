// src/app/api/travel/projects/[id]/close/route.js
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getJson, putJson, getBytes, putBytes } from "../../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function safeName(s) {
  return String(s || "receipts").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

// Magic-byte sniffing (don’t trust filename or metadata)
function detectImageKind(bytes) {
  if (!bytes || bytes.length < 12) return "unknown";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "png";

  // JPG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";

  // WEBP: "RIFF"...."WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "webp";

  return "unknown";
}

export async function POST(_req, { params }) {
  try {
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

    // Cover / summary page
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
      // NOTE: ASCII only (no "→")
      line("Travel Dates:", `${meta.travelStart} to ${meta.travelEnd}`);
      line("Photos:", String(photos.length));
      line("Generated:", nowIso());
    }

    // One receipt per page
    for (const p of photos) {
      const got = await getBytes(p.key);
      if (!got?.bytes) continue;

      const bytes = got.bytes;
      const kind = detectImageKind(bytes);

      if (kind === "webp") {
        return Response.json(
          { error: `One of your uploads is WEBP (${p.title || p.key}). Re-upload as JPG or PNG.` },
          { status: 400 }
        );
      }
      if (kind !== "jpg" && kind !== "png") {
        return Response.json(
          { error: `Unsupported image type for "${p.title || p.key}". Re-upload as JPG or PNG.` },
          { status: 400 }
        );
      }

      const img = kind === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
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
      downloadUrl: `/api/travel/projects/${encodeURIComponent(id)}/pdf`
    });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
