export async function onRequestGet(context) {
  try {
    const { CNCTOOLS_BUCKET } = context.env;
    const id = context.params.id;

    const metaKey = `travel/projects/${id}/meta.json`;
    const metaObj = await CNCTOOLS_BUCKET.get(metaKey);
    if (!metaObj) {
      return new Response("Project not found", { status: 404 });
    }
    const meta = await metaObj.json();

    if (!meta.pdfKey) {
      return new Response("PDF not generated yet. Close the project first.", { status: 400 });
    }

    const pdfObj = await CNCTOOLS_BUCKET.get(meta.pdfKey);
    if (!pdfObj) return new Response("PDF missing in storage", { status: 404 });

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "no-store");

    return new Response(pdfObj.body, { headers });
  } catch (err) {
    return new Response(err?.message || String(err), { status: 500 });
  }
}
