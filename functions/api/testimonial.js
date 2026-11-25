import { json, clean, ipHash, now } from '../_lib/util.js';

// Public submission: saved as "pending" until you approve it in /admin.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Service is not set up yet.' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.website) return json({ ok: true });
  const name = clean(b.name, 80), message = clean(b.message, 800);
  const rating = Math.min(5, Math.max(1, parseInt(b.rating, 10) || 5));
  if (!name || message.length < 10) return json({ error: 'Please enter your name and a short message (at least 10 characters).' }, 400);
  const ih = await ipHash(request, env);
  const r = await env.DB.prepare('SELECT COUNT(*) AS c FROM testimonials WHERE ip_hash=? AND created_at>?').bind(ih, now() - 3600).first();
  if (r && r.c >= 3) return json({ error: 'Too many submissions. Please try again later.' }, 429);
  await env.DB.prepare("INSERT INTO testimonials(created_at,name,role,rating,message,published,source,ip_hash) VALUES(?,?,?,?,?,0,'client',?)")
    .bind(now(), name, clean(b.role, 100), rating, message, ih).run();
  return json({ ok: true }, 201);
}
