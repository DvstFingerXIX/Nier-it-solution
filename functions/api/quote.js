import { json, clean, ipHash, now } from '../_lib/util.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Service is not set up yet. Please use Email, Messenger or Viber.' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.website) return json({ ok: true }); // honeypot
  const name = clean(b.name, 100), contact = clean(b.contact, 120);
  if (!name || contact.length < 7) return json({ error: 'Please enter your name and a phone number or email.' }, 400);
  const ih = await ipHash(request, env);
  const r = await env.DB.prepare('SELECT COUNT(*) AS c FROM quotes WHERE ip_hash=? AND created_at>?').bind(ih, now() - 600).first();
  if (r && r.c >= 5) return json({ error: 'Too many requests. Please try again later or message us on Messenger.' }, 429);
  await env.DB.prepare('INSERT INTO quotes(created_at,name,company,contact,request_type,category,quantity,needed_by,details,status,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(now(), name, clean(b.company, 150), contact, clean(b.request_type, 60), clean(b.category, 80), clean(b.quantity, 40), clean(b.needed_by, 60), clean(b.details, 2000), 'new', ih).run();
  return json({ ok: true }, 201);
}
