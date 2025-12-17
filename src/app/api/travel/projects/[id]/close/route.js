import { PDFDocument, StandardFonts } from "pdf-lib";
import { getJson, putJson, getBytes, putBytes } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function safeName(s) {
  return String(s || "receipts").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

function isPngBytes(u8) {
  // 89 50 4E 47 0D 0A 1A 0A
  return (
    u8 &&
    u8.length >= 8 &&
    u8[0] === 0x89 &&
    u8[1] === 0x50 &&
    u8[2] === 0x4e &&
    u8[3] === 0x47 &&
    u8[4] === 0x0d &&
    u8[5] === 0x0a &&
    u8[6] === 0x1a &&
    u8[7] === 0x0a
  );
}

function isJpgBytes(u8) {
  // FF D8 FF
  return u8 && u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff;
}

function toU8(bytes) {
  if (!bytes) return null;
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  // Cloudflare sometimes gives Buffer-like
  if (typeof bytes === "object" && bytes.buffer) return new Uint8Array(bytes.buffer);
  return new Uint8Array(bytes);
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
      return Response.json(
        { error: "Upload at least one photo before closing." },
        { status: 400 }
      );
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
      line("Travel Dates:", `${meta.travelStart} -> ${meta.travelEnd}`);
      line("Photos:", String(photos.length));
      line("Generated:", nowIso());
    }

    // One receipt per page
    for (const p of photos) {
      if (!p?.key) continue;

      const got = await getBytes(p.key);
      const u8 = toU8(got?.bytes);
      if (!u8 || !u8.length) continue;

      let img;
      if (isPngBytes(u8)) {
        img = await pdf.embedPng(u8);
      } else if (isJpgBytes(u8)) {
        img = await pdf.embedJpg(u8);
      } else {
        // If you ever uploaded something unexpected, skip instead of crashing the whole PDF
        console.warn("Skipping unsupported image bytes for key:", p.key, "contentType:", got?.contentType);
        continue;
      }

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
  } catch (err) {
    console.error("CLOSE PDF ERROR:", err);
    return Response.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
