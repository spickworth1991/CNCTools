import { getEnv } from "../../_cf";

export const runtime = "edge";

export async function GET(_req, { params }) {
  const env = getEnv();
  if (!env?.CNCTOOLS_BUCKET) return new Response("R2 not configured", { status: 500 });

  const key = params?.key;
  const objKey = `tools/${key}`;

  const obj = await env.CNCTOOLS_BUCKET.get(objKey);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType || "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function PUT(request, { params }) {
  const env = getEnv();
  if (!env?.CNCTOOLS_BUCKET) return new Response("R2 not configured", { status: 500 });

  const key = params?.key;
  const objKey = `tools/${key}`;

  const body = await request.text();
  await env.CNCTOOLS_BUCKET.put(objKey, body, {
    httpMetadata: { contentType: "text/plain; charset=utf-8" }
  });

  return new Response("OK");
}
