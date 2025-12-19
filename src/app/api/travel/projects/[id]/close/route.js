// src/app/api/travel/projects/[id]/close/route.js
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getJson, putJson, getBytes, putBytes } from "../../../../_cf";

export const runtime = "edge";

const EASTERN_TZ = "America/Detroit";

function formatMoneyFromCents(cents) {
  if (cents === null || cents === undefined || cents === "") return "";
  const n = typeof cents === "number" ? cents : Number(cents);
  if (!Number.isFinite(n)) return "";
  return `$${(n / 100).toFixed(2)}`;
}


function nowIso() {
  return new Date().toISOString();
}

function formatEasternDateTime(d = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

function safeName(s) {
  return String(s || "receipts").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

function sniffImageKind(bytes) {
  if (!bytes || bytes.length < 12) return null;

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
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

  // JPEG starts with FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  return null;
}

function wrapText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const w of words) {
    if (!line) {
      line = w;
      continue;
    }
    if ((line + " " + w).length <= maxChars) {
      line += " " + w;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function POST(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    // Travel End is chosen at close time
    const body = await req.json().catch(() => ({}));
    const travelEnd = String(body?.travelEnd || "").trim();
    if (!travelEnd) {
      return Response.json({ error: "Travel End date is required to close." }, { status: 400 });
    }

    const metaKey = `travel/projects/${id}/meta.json`;
    const meta = await getJson(metaKey);
    if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });
    if (meta.status !== "open") return Response.json({ error: "Already closed" }, { status: 400 });

    const photos = Array.isArray(meta.photos) ? meta.photos : [];
    if (!photos.length) {
      return Response.json({ error: "Upload at least one receipt before closing." }, { status: 400 });
    }

    // finalize travel end on meta BEFORE pdf
    meta.travelEnd = travelEnd;

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
      line("Travel Dates:", `${meta.travelStart} to ${meta.travelEnd}`);
      line("Receipts:", String(photos.length));
      line("Generated:", formatEasternDateTime(new Date()));
    }

    // Each receipt page: Title/Desc at top + image below
    for (const p of photos) {
      const got = await getBytes(p.key);
      if (!got?.bytes) continue;

      const bytes = got.bytes instanceof Uint8Array ? got.bytes : new Uint8Array(got.bytes);
      const kind = sniffImageKind(bytes);

      if (!kind) {
        // Skip unknown image types safely
        continue;
      }

      const img = kind === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

      const page = pdf.addPage([612, 792]);

      const margin = 36;
      const headerTop = 792 - margin;
      let y = headerTop;

      const title = String(p.title || "").trim();
      const desc = String(p.description || "").trim();

      // Title
      if (title) {
        const titleLines = wrapText(title, 60);
        for (const line of titleLines) {
          page.drawText(line, { x: margin, y, size: 16, font });
          y -= 20;
        }
        y -= 4;
      }

      // Description
      if (desc) {
        const descLines = wrapText(desc, 90);
        for (const line of descLines) {
          page.drawText(line, { x: margin, y, size: 11, font });
          y -= 14;
        }
        y -= 6;
      }

      // Amount + company charged (if present)
        {
          const amountText = formatMoneyFromCents(p.amountCents);
          const hasCompany = typeof p.companyCharged === "boolean";

          if (amountText || hasCompany) {
            const companyText = hasCompany ? (p.companyCharged ? "Yes" : "No") : "N/A";
            page.drawText(
              `Amount: ${amountText || "(n/a)"}    Company Charged: ${companyText}`,
              { x: margin, y, size: 11, font }
            );
            y -= 16;
          }
        }


      // Optional: uploaded date
      if (p.uploadedAt) {
        page.drawText(`Uploaded: ${String(p.uploadedAt)}`, { x: margin, y, size: 9, font });
        y -= 14;
      }

      // Image area below header
      const imageTopY = y - 8;
      const imageBottomY = margin;
      const maxW = 612 - margin * 2;
      const maxH = imageTopY - imageBottomY;

      const { width, height } = img.scale(1);
      const scale = Math.min(maxW / width, maxH / height);

      const drawW = width * scale;
      const drawH = height * scale;
      const x = (612 - drawW) / 2;
      const imgY = imageBottomY + (maxH - drawH) / 2;

      page.drawImage(img, { x, y: imgY, width: drawW, height: drawH });
    }

    const pdfBytes = await pdf.save();
    const pdfKey = `travel/projects/${id}/pdf/${safeName(meta.serviceReportNumber)}.pdf`;

    await putBytes(pdfKey, pdfBytes, "application/pdf");

    meta.status = "closed";
    meta.closedAt = nowIso();
    meta.updatedAt = nowIso();
    meta.pdfKey = pdfKey;

    await putJson(metaKey, meta);

    return Response.json({
      ok: true,
      downloadUrl: `/api/travel/projects/${encodeURIComponent(id)}/pdf`,
    });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
