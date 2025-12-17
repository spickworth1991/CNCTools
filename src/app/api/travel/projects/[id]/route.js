import { getJson } from "../../../_cf";

export const runtime = "edge";

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const meta = await getJson(`travel/projects/${id}/meta.json`);
  if (!meta) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ project: meta });
}
