import { getJson, getBytes } from "../../../../_cf";

export const runtime = "edge";

export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const meta = await getJson(`travel/projects/${id}/meta.json`);
    if (!meta?.pdfKey) return Response.json({ error: "PDF not found" }, { status: 404 });

    const got = await getBytes(meta.pdfKey);
    if (!got?.bytes) return Response.json({ error: "PDF not found" }, { status: 404 });

    return new Response(got.bytes, {
      headers: {
        "content-type": "application/pdf",
        "cache-control": "no-store",
        // Optional: makes it download instead of inline open
        // "content-disposition": `attachment; filename="${(meta.serviceReportNumber || "receipts").replaceAll('"', "")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF GET ERROR:", err);
    return Response.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
