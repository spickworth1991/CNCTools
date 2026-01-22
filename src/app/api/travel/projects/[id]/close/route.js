// src/app/api/travel/projects/[id]/close/route.js
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import { getJson, putJson, getBytes, putBytes } from "../../../../_cf";

export const runtime = "edge";

const EASTERN_TZ = "America/Detroit";

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

// Minimal EXIF orientation reader for JPEG.
// Returns 1, 3, 6, 8 or null if not found/unsupported.
function getJpegExifOrientation(bytes) {
  try {
    if (!bytes || bytes.length < 4) return null;
    // JPEG SOI
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

    let i = 2;
    while (i + 4 < bytes.length) {
      if (bytes[i] !== 0xff) break;
      const marker = bytes[i + 1];
      i += 2;

      // EOI or SOS
      if (marker === 0xd9 || marker === 0xda) break;

      const size = (bytes[i] << 8) | bytes[i + 1];
      if (!size || i + size > bytes.length) break;

      // APP1
      if (marker === 0xe1) {
        const start = i + 2;
        // "Exif\0\0"
        if (
          bytes[start] === 0x45 &&
          bytes[start + 1] === 0x78 &&
          bytes[start + 2] === 0x69 &&
          bytes[start + 3] === 0x66 &&
          bytes[start + 4] === 0x00 &&
          bytes[start + 5] === 0x00
        ) {
          const tiff = start + 6;

          const little =
            bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49
              ? true
              : bytes[tiff] === 0x4d && bytes[tiff + 1] === 0x4d
              ? false
              : null;
          if (little == null) return null;

          const u16 = (off) =>
            little
              ? bytes[off] | (bytes[off + 1] << 8)
              : (bytes[off] << 8) | bytes[off + 1];
          const u32 = (off) =>
            little
              ? (bytes[off] |
                  (bytes[off + 1] << 8) |
                  (bytes[off + 2] << 16) |
                  (bytes[off + 3] << 24)) >>>
                0
              : ((bytes[off] << 24) |
                  (bytes[off + 1] << 16) |
                  (bytes[off + 2] << 8) |
                  bytes[off + 3]) >>>
                0;

          // TIFF header sanity: 0x002A
          if (u16(tiff + 2) !== 0x002a) return null;

          const ifd0Offset = u32(tiff + 4);
          const ifd0 = tiff + ifd0Offset;
          if (ifd0 + 2 > bytes.length) return null;

          const numEntries = u16(ifd0);
          let p = ifd0 + 2;

          for (let n = 0; n < numEntries; n++) {
            const entry = p + n * 12;
            if (entry + 12 > bytes.length) break;

            const tag = u16(entry);
            // Orientation tag
            if (tag === 0x0112) {
              const type = u16(entry + 2);
              const count = u32(entry + 4);

              // type 3 = SHORT, count 1
              if (type === 3 && count === 1) {
                const valOff = entry + 8;
                const val = u16(valOff);
                if (val === 1 || val === 3 || val === 6 || val === 8) return val;
              }
              return null;
            }
          }
        }
      }

      i += size;
    }
  } catch {
    return null;
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

function exifToRotationDegrees(ori) {
  // EXIF Orientation values:
  // 1 = normal
  // 3 = rotate 180
  // 6 = rotate 90 CW
  // 8 = rotate 90 CCW
  // pdf-lib's degrees() is counter-clockwise.
  if (ori === 3) return 180;
  if (ori === 6) return 270; // 90 CW
  if (ori === 8) return 90;  // 90 CCW
  return 0;
}

// ===== PDF QUALITY PRESETS =====
const PDF_QUALITY_PRESETS = {
  email: { maxDim: 1600, jpegQuality: 0.75 },
  max: { maxDim: 4096, jpegQuality: 0.92 },
};

function pickPreset(mode) {
  const m = String(mode || "").toLowerCase();
  return PDF_QUALITY_PRESETS[m] || PDF_QUALITY_PRESETS.email;
}

function hasWorkerCanvasSupport() {
  return typeof createImageBitmap === "function" && typeof OffscreenCanvas !== "undefined";
}

// Returns { bytes: Uint8Array, kind: "jpg" } or null if unsupported/fails.
async function rasterizeToJpeg(inputBytes, inputKind, preset) {
  try {
    if (!hasWorkerCanvasSupport()) return null;

    const mime = inputKind === "png" ? "image/png" : "image/jpeg";
    const blob = new Blob([inputBytes], { type: mime });

    // ✅ important: honors EXIF orientation if present
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
    try {
      const w0 = bmp.width || 0;
      const h0 = bmp.height || 0;
      if (!w0 || !h0) return null;

      const maxDim = Number(preset?.maxDim) || 1600;
      const quality = Number.isFinite(Number(preset?.jpegQuality)) ? Number(preset.jpegQuality) : 0.75;

      const scale = Math.min(1, maxDim / Math.max(w0, h0));
      const w = Math.max(1, Math.round(w0 * scale));
      const h = Math.max(1, Math.round(h0 * scale));

      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0, w, h);

      const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality });
      const ab = await outBlob.arrayBuffer();
      return { bytes: new Uint8Array(ab), kind: "jpg" };
    } finally {
      try { bmp.close(); } catch {}
    }
  } catch {
    return null;
  }
}

function displayAmount(p) {
  // resilient to old/new shapes
  if (!p) return "";
  if (p.amount != null && String(p.amount).trim() !== "") return String(p.amount).trim();

  const cents = Number(p.amountCents);
  if (Number.isFinite(cents)) return (cents / 100).toFixed(2);

  return "";
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

    // ✅ NEW: PDF quality mode (defaults to email)
    const pdfQuality = String(body?.pdfQuality || "email").trim();
    const preset = pickPreset(pdfQuality);

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

    // Cover / summary page (always portrait)
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
      line("PDF Quality:", pdfQuality || "email");
    }

    // Each receipt: choose portrait/landscape page based on image
    for (const p of photos) {
      const got = await getBytes(p.key);
      if (!got?.bytes) continue;

      const originalBytes = got.bytes instanceof Uint8Array ? got.bytes : new Uint8Array(got.bytes);
      const originalKind = sniffImageKind(originalBytes);
      if (!originalKind) continue;

      // ✅ First try to rasterize (downscale + compress + auto-orient)
      let raster = null;
      if (pdfQuality !== "max") {
        // Email quality: rasterize (downscale + compress + auto-orient).
        raster = await rasterizeToJpeg(originalBytes, originalKind, preset);
      }

      let bytes = raster?.bytes || originalBytes;
      let kind = raster?.kind || originalKind;
// If we rasterized, EXIF is baked-in, so rotation should be 0
      const exifOri = !raster && kind === "jpg" ? getJpegExifOrientation(bytes) : null;
      const rotDeg = !raster ? exifToRotationDegrees(exifOri) : 0;

      const img = kind === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

      const base = img.scale(1);
      const baseW = base.width;
      const baseH = base.height;

      // Effective dimensions AFTER rotation
      const effW = rotDeg % 180 === 0 ? baseW : baseH;
      const effH = rotDeg % 180 === 0 ? baseH : baseW;

      // Page orientation based on effective shape
      const PORTRAIT = [612, 792];
      const LANDSCAPE = [792, 612];
      const [pageW, pageH] = effW > effH ? LANDSCAPE : PORTRAIT;

      const page = pdf.addPage([pageW, pageH]);

      const margin = 36;
      const headerTop = pageH - margin;
      let y = headerTop;

      const title = String(p.title || "").trim();
      const desc = String(p.description || "").trim();

      // Title
      if (title) {
        const titleLines = wrapText(title, 60);
        for (const ln of titleLines) {
          page.drawText(ln, { x: margin, y, size: 16, font });
          y -= 20;
        }
        y -= 4;
      }

      // Description
      if (desc) {
        const descLines = wrapText(desc, 90);
        for (const ln of descLines) {
          page.drawText(ln, { x: margin, y, size: 11, font });
          y -= 14;
        }
        y -= 6;
      }

      // Optional: uploaded date
      if (p.uploadedAt) {
        page.drawText(`Uploaded: ${String(p.uploadedAt)}`, { x: margin, y, size: 9, font });
        y -= 14;
      }

      // ✅ NEW: Amount + Company Charged
      const amt = displayAmount(p);
      const cc =
        p.companyCharged === true ? "Yes" : p.companyCharged === false ? "No" : "";
      if (amt || cc) {
        page.drawText(
          `Amount: ${amt || ""}${cc ? `   Company Charged: ${cc}` : ""}`,
          { x: margin, y, size: 10, font }
        );
        y -= 14;
      }

      // Image area below header
      const imageTopY = y - 8;
      const imageBottomY = margin;

      const maxW = pageW - margin * 2;
      const maxH = imageTopY - imageBottomY;

      // Scale based on effective dims (after rotation)
      const scale = Math.min(maxW / effW, maxH / effH);

      const drawW = baseW * scale;
      const drawH = baseH * scale;

      const shownW = rotDeg % 180 === 0 ? drawW : drawH;
      const shownH = rotDeg % 180 === 0 ? drawH : drawW;

      const desiredX = (pageW - shownW) / 2;
      const desiredY = imageBottomY + (maxH - shownH) / 2;

      // Your existing translation logic (kept)
      let x = desiredX;
      let imgY = desiredY;

      if (rotDeg === 90) {
        x = desiredX + drawH;
        imgY = desiredY;
      } else if (rotDeg === 180) {
        x = desiredX + drawW;
        imgY = desiredY + drawH;
      } else if (rotDeg === 270) {
        x = desiredX;
        imgY = desiredY + drawW;
      }

      page.drawImage(img, {
        x,
        y: imgY,
        width: drawW,
        height: drawH,
        rotate: rotDeg ? degrees(rotDeg) : undefined,
      });
    }

    const pdfBytes = await pdf.save();
    const pdfKey = `travel/projects/${id}/pdf/${safeName(meta.serviceReportNumber)}.pdf`;

    await putBytes(pdfKey, pdfBytes, "application/pdf");

    meta.status = "closed";
    meta.closedAt = nowIso();
    meta.updatedAt = nowIso();
    meta.pdfKey = pdfKey;

    // ✅ remember last used quality
    meta.lastPdfQuality = pdfQuality || "email";

    await putJson(metaKey, meta);

    return Response.json({
      ok: true,
      downloadUrl: `/api/travel/projects/${encodeURIComponent(id)}/pdf`,
    });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
