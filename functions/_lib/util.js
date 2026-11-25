const enc = new TextEncoder();
export const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h } });
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const sha = async (t) => hex(await crypto.subtle.digest('SHA-256', enc.encode(t)));
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
export function eq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const secret = (env) => env.SESSION_SECRET || env.ADMIN_PASSWORD || '';
export const now = () => Math.floor(Date.now() / 1000);
export async function makeToken(env) {
  const exp = now() + 7 * 86400;
  return exp + '.' + (await hmac(secret(env), String(exp)));
}
export async function isAdmin(request, env) {
  if (!secret(env)) return false;
  const c = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)nier_admin=([^;]+)/);
  if (!c) return false;
  const [exp, sig] = c[1].split('.');
  if (!exp || !sig || +exp < now()) return false;
  return eq(sig, await hmac(secret(env), exp));
}
export const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
export const ipHash = async (request, env) => (await sha((request.headers.get('CF-Connecting-IP') || '0') + secret(env))).slice(0, 16);
export function magic(u) {
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'image/jpeg';
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return 'image/webp';
  return null;
}
function b64(u) {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
export async function saveImage(env, file) {
  if (!file || typeof file === 'string' || !file.size) return null;
  if (file.size > 1500000) throw new Error('Image is too large (max 1.5 MB). Use a smaller photo.');
  const u = new Uint8Array(await file.arrayBuffer());
  const mime = magic(u);
  if (!mime) throw new Error('Only JPG, PNG or WebP images are allowed.');
  const id = hex(crypto.getRandomValues(new Uint8Array(8)));
  await env.DB.prepare('INSERT INTO images(id,mime,data,created_at) VALUES(?,?,?,?)').bind(id, mime, b64(u), now()).run();
  return id;
}
export const dropImage = (env, id) => (id ? env.DB.prepare('DELETE FROM images WHERE id=?').bind(id).run() : null);
