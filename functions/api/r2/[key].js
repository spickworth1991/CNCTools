export async function onRequest(context) {
  const { request, env, params } = context;
  const key = params.key;

  if (!key || typeof key !== "string") {
    return new Response("Missing key", { status: 400 });
  }

  // Simple safety guard (avoid weird keys like ../../)
  if (!/^[a-zA-Z0-9/_\-\.]+$/.test(key)) {
    return new Response("Invalid key", { status: 400 });
  }

  const objKey = `cnc-tools/${key}`;

  if (request.method === "GET") {
    const obj = await env.CNCTOOLS_BUCKET.get(objKey);
    if (!obj) return new Response("Not found", { status: 404 });

    return new Response(obj.body, {
      headers: {
        "content-type": obj.httpMetadata?.contentType || "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  if (request.method === "PUT") {
    const body = await request.text();

    await env.CNCTOOLS_BUCKET.put(objKey, body, {
      httpMetadata: { contentType: "text/plain; charset=utf-8" }
    });

    return new Response("OK");
  }

  return new Response("Method not allowed", { status: 405 });
}
