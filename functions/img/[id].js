export async function onRequestGet({ env, params }) {
  const id = String(params.id || '');
  if (!env.DB || !/^[a-f0-9]{16}$/.test(id)) return new Response('Not found', { status: 404 });
  const r = await env.DB.prepare('SELECT mime,data FROM images WHERE id=?').bind(id).first();
  if (!r) return new Response('Not found', { status: 404 });
  const bin = atob(r.data), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Response(u, { headers: { 'Content-Type': r.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
