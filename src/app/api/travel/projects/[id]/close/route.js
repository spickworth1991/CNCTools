import { PDFDocument, StandardFonts } from "pdf-lib";
import { getJson, putJson, getBytes, putBytes } from "../../../../_cf";

export const runtime = "edge";

function nowIso() {
  return new Date().toISOString();
}

function safeName(s) {
  return String(s || "receipts").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

export async function POST(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const metaKey = `travel/projects/${id}/meta.json`;
  const meta = await getJson(metaKey);
  if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });
  if (meta.status !== "open") return Response.json({ error: "Already closed" }, { status: 400 });

  const photos = Array.isArray(meta.photos) ? meta.photos : [];
  if (!photos.length) return Response.json({ error: "Upload at least one photo before closing." }, { status: 400 });

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
    line("Travel Dates:", `${meta.travelStart} → ${meta.travelEnd}`);
    line("Photos:", String(photos.length));
    line("Generated:", nowIso());
  }

  // One receipt per page (simple: full-page image)
  for (const p of photos) {
    const got = await getBytes(p.key);
    if (!got?.bytes) continue;

    const bytes = got.bytes;
    const isPng = (p.key || "").toLowerCase().endsWith(".png") || (got.contentType || "").includes("png");

    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([612, 792]);

    // Fit image into page with margins
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
}
