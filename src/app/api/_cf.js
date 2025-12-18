// src/_cf.js  (or wherever your _cf currently lives)
import { getRequestContext } from "@cloudflare/next-on-pages";

export function getEnv() {
  try {
    const ctx = getRequestContext();
    return ctx?.env || null;
  } catch {
    return null;
  }
}

// Simple in-memory fallback so `next dev` works locally without R2 bindings
function mem() {
  if (!globalThis.__TRAVEL_MEM__) {
    globalThis.__TRAVEL_MEM__ = {
      meta: new Map(),  // key -> json
      blob: new Map(),  // key -> Uint8Array
    };
  }
  return globalThis.__TRAVEL_MEM__;
}

export async function putJson(key, value) {
  const env = getEnv();
  if (env?.CNCTOOLS_BUCKET) {
    await env.CNCTOOLS_BUCKET.put(key, JSON.stringify(value, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8" }
    });
    return;
  }
  mem().meta.set(key, value);
}

export async function getJson(key) {
  const env = getEnv();
  if (env?.CNCTOOLS_BUCKET) {
    const obj = await env.CNCTOOLS_BUCKET.get(key);
    if (!obj) return null;
    return JSON.parse(await obj.text());
  }
  return mem().meta.get(key) || null;
}

export async function putBytes(key, bytes, contentType) {
  const env = getEnv();
  if (env?.CNCTOOLS_BUCKET) {
    await env.CNCTOOLS_BUCKET.put(key, bytes, {
      httpMetadata: { contentType: contentType || "application/octet-stream" }
    });
    return;
  }
  mem().blob.set(key, bytes);
}

export async function getBytes(key) {
  const env = getEnv();
  if (env?.CNCTOOLS_BUCKET) {
    const obj = await env.CNCTOOLS_BUCKET.get(key);
    if (!obj) return null;
    const ab = await obj.arrayBuffer();
    return { bytes: new Uint8Array(ab), contentType: obj.httpMetadata?.contentType || null };
  }
  const bytes = mem().blob.get(key);
  if (!bytes) return null;
  return { bytes, contentType: null };
}

export async function listKeys(prefix) {
  const env = getEnv();
  if (env?.CNCTOOLS_BUCKET) {
    const out = [];
    let cursor = undefined;
    while (true) {
      const res = await env.CNCTOOLS_BUCKET.list({ prefix, cursor });
      for (const o of res.objects || []) out.push(o.key);
      if (!res.truncated) break;
      cursor = res.cursor;
    }
    return out;
  }
  const m = mem();
  const keys = new Set([...m.meta.keys(), ...m.blob.keys()]);
  return [...keys].filter((k) => k.startsWith(prefix));
}

export async function deleteKey(key) {
  const env = getEnv();
  if (env?.CNCTOOLS_BUCKET) {
    await env.CNCTOOLS_BUCKET.delete(key);
    return;
  }
  mem().meta.delete(key);
  mem().blob.delete(key);
}

export async function deletePrefix(prefix) {
  const keys = await listKeys(prefix);
  for (const k of keys) await deleteKey(k);
  return keys.length;
}
