// src/app/api/travel/projects/[id]/photos/[photoId]/route.js
import { getJson, getBytes } from "../../../../../_cf";

export const runtime = "edge";

export async function GET(_req, { params }) {
  const id = params?.id;
  const photoId = params?.photoId;

  if (!id) return new Response("Missing id", { status: 400 });
  if (!photoId) return new Response("Missing photoId", { status: 400 });

  const meta = await getJson(`travel/projects/${id}/meta.json`);
  if (!meta?.photos?.length) return new Response("Not found", { status: 404 });

  const photo = meta.photos.find((p) => p.photoId === photoId);
  if (!photo?.key) return new Response("Not found", { status: 404 });

  const got = await getBytes(photo.key);
  if (!got?.bytes) return new Response("Not found", { status: 404 });

  const contentType =
    photo.contentType ||
    got.contentType ||
    (photo.key.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

  return new Response(got.bytes, {
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}
