// src/app/api/travel/projects/[id]/pdf/route.js
import { getJson, getBytes } from "../../../../_cf";

export const runtime = "edge";

function safeName(s) {
  return String(s || "receipts").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const meta = await getJson(`travel/projects/${id}/meta.json`);
    if (!meta?.pdfKey) {
      return Response.json({ error: "PDF not found" }, { status: 404 });
    }

    const got = await getBytes(meta.pdfKey);
    if (!got?.bytes) {
      return Response.json({ error: "PDF not found" }, { status: 404 });
    }

    // Use SR# if possible, otherwise fallback to project id
    const base = safeName(meta.serviceReportNumber || `project_${id}`);
    const filename = `${base}.pdf`;

    return new Response(got.bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
