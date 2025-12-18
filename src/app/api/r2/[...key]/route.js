import { getBytes } from "../../_cf";

export const runtime = "edge";

export async function GET(_req, { params }) {
  const keyParts = params?.key;
  const key = Array.isArray(keyParts) ? keyParts.join("/") : String(keyParts || "");
  if (!key) return new Response("Missing key", { status: 400 });

  const got = await getBytes(key);
  if (!got?.bytes) return new Response("Not found", { status: 404 });

  return new Response(got.bytes, {
    headers: {
      "content-type": got.contentType || "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}
