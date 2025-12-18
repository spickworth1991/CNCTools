// src/app/api/travel/projects/[id]/pdf/route.js
import { getJson, getBytes } from "../../../../_cf";

export const runtime = "edge";

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return new Response("Missing id", { status: 400 });

  const meta = await getJson(`travel/projects/${id}/meta.json`);
  if (!meta?.pdfKey) return new Response("PDF not found", { status: 404 });

  const got = await getBytes(meta.pdfKey);
  if (!got?.bytes) return new Response("PDF not found", { status: 404 });

  return new Response(got.bytes, {
    headers: {
      "content-type": "application/pdf",
      "cache-control": "no-store",
    },
  });
}
