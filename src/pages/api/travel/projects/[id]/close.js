import { PDFDocument, StandardFonts } from "pdf-lib";

function wrapText(text, maxLen) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = [];
  for (const w of words) {
    const test = [...line, w].join(" ");
    if (test.length > maxLen) {
      if (line.length) lines.push(line.join(" "));
      line = [w];
    } else {
      line.push(w);
    }
  }
  if (line.length) lines.push(line.join(" "));
  return lines;
}

function sanitizeFilename(name) {
  const s = String(name || "service-report").trim();
  return s.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").slice(0, 120);
}

export async function onRequestPost(context) {
  try {
    const { CNCTOOLS_BUCKET } = context.env;
    const id = context.params.id;

    const metaKey = `travel/projects/${id}/meta.json`;
    const metaObj = await CNCTOOLS_BUCKET.get(metaKey);
    if (!metaObj) throw new Error("Project not found");
    const meta = await metaObj.json();

    if (meta.status !== "open") {
      return new Response(JSON.stringify({ ok: true, downloadUrl: `/api/travel/projects/${id}/pdf` }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const photos = Array.isArray(meta.photos) ? meta.photos : [];
    if (!photos.length) throw new Error("No photos uploaded");

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageW = 612; // Letter
    const pageH = 792;
    const margin = 40;

    // Cover page
    {
      const p = pdfDoc.addPage([pageW, pageH]);
      const title = `Service Report: ${meta.serviceReportNumber}`;
      const sub1 = `Customer: ${meta.customerName}`;
      const sub2 = `Travel Dates: ${meta.travelStart} → ${meta.travelEnd}`;
      const sub3 = `Photos: ${photos.length}`;

      p.drawText("Combined Receipts", { x: margin, y: pageH - margin - 10, size: 22, font: fontBold });
      p.drawText(title, { x: margin, y: pageH - margin - 50, size: 14, font: fontBold });
      p.drawText(sub1, { x: margin, y: pageH - margin - 70, size: 12, font });
      p.drawText(sub2, { x: margin, y: pageH - margin - 88, size: 12, font });
      p.drawText(sub3, { x: margin, y: pageH - margin - 106, size: 12, font });

      p.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: margin,
        y: margin,
        size: 10,
        font
      });
    }

    // Photo pages
    for (let i = 0; i < photos.length; i++) {
      const ph = photos[i];
      const obj = await CNCTOOLS_BUCKET.get(ph.key);
      if (!obj) continue;

      const bytes = await obj.arrayBuffer();
      let embedded;
      if (ph.contentType === "image/png") {
        embedded = await pdfDoc.embedPng(bytes);
      } else {
        embedded = await pdfDoc.embedJpg(bytes);
      }

      const p = pdfDoc.addPage([pageW, pageH]);

      // Header
      const header = `${meta.serviceReportNumber} — ${meta.customerName} — ${meta.travelStart} → ${meta.travelEnd}`;
      p.drawText(header, { x: margin, y: pageH - margin, size: 11, font: fontBold });

      // Title / description
      const titleLines = wrapText(`Title: ${ph.title}`, 70);
      const descLines = ph.description ? wrapText(`Description: ${ph.description}`, 70) : [];
      let y = pageH - margin - 24;

      for (const line of titleLines) {
        p.drawText(line, { x: margin, y, size: 11, font });
        y -= 14;
      }
      for (const line of descLines) {
        p.drawText(line, { x: margin, y, size: 10, font });
        y -= 13;
      }

      // Image box area
      const topY = y - 10;
      const imgMaxW = pageW - margin * 2;
      const imgMaxH = topY - margin;

      const imgW = embedded.width;
      const imgH = embedded.height;

      const scale = Math.min(imgMaxW / imgW, imgMaxH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const x = margin + (imgMaxW - drawW) / 2;
      const imgY = margin + (imgMaxH - drawH) / 2;

      p.drawImage(embedded, { x, y: imgY, width: drawW, height: drawH });

      // Footer page number
      p.drawText(`Receipt ${i + 1} of ${photos.length}`, { x: margin, y: margin - 18, size: 10, font });
    }

    const pdfBytes = await pdfDoc.save();

    const filenameBase = sanitizeFilename(meta.serviceReportNumber);
    const pdfKey = `travel/projects/${id}/${filenameBase}.pdf`;

    await CNCTOOLS_BUCKET.put(pdfKey, pdfBytes, {
      httpMetadata: { contentType: "application/pdf" }
    });

    meta.status = "closed";
    meta.closedAt = new Date().toISOString();
    meta.pdfKey = pdfKey;

    await CNCTOOLS_BUCKET.put(metaKey, JSON.stringify(meta, null, 2), {
      httpMetadata: { contentType: "application/json" }
    });

    return new Response(
      JSON.stringify({
        ok: true,
        pdfKey,
        downloadUrl: `/api/travel/projects/${id}/pdf`
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
