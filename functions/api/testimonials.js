import { json } from '../_lib/util.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json([], 200);
  const { results } = await env.DB.prepare('SELECT id,name,role,rating,message,photo FROM testimonials WHERE published=1 ORDER BY sort DESC, id DESC LIMIT 60').all();
  return json(results || [], 200, { 'Cache-Control': 'public, max-age=60' });
}
