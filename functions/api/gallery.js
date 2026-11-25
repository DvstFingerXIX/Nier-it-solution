import { json } from '../_lib/util.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json([], 200);
  const { results } = await env.DB.prepare('SELECT image AS id,caption,category,width,height FROM gallery WHERE published=1 ORDER BY id DESC LIMIT 200').all();
  return json(results || [], 200, { 'Cache-Control': 'public, max-age=60' });
}
