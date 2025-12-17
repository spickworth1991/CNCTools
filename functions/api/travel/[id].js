export async function onRequestGet(context) {
  try {
    const { CNCTOOLS_BUCKET } = context.env;
    const id = context.params.id;

    const metaKey = `travel/projects/${id}/meta.json`;
    const obj = await CNCTOOLS_BUCKET.get(metaKey);
    if (!obj) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const project = await obj.json();
    return new Response(JSON.stringify({ project }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
