import { getJson, deleteKey, deletePrefix } from "../../../_cf";

export const runtime = "edge";

export async function DELETE(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const metaKey = `travel/projects/${id}/meta.json`;
    const meta = await getJson(metaKey);
    if (!meta) return Response.json({ error: "Project not found" }, { status: 404 });

    if (meta.status !== "closed") {
      return Response.json({ error: "Only CLOSED projects can be deleted." }, { status: 400 });
    }

    // Delete all objects under this project
    await deletePrefix(`travel/projects/${id}/`);

    // (metaKey is included in the prefix, but safe to ensure)
    await deleteKey(metaKey);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
