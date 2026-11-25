import { json, clean, ipHash, now, sha, eq, makeToken, isAdmin, saveImage, dropImage } from '../../_lib/util.js';

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'closed'];
const CATS = ['Computers', 'Printers', 'Cameras and security', 'Accessories and parts', 'Phones', 'Company'];
const COOKIE_OFF = 'nier_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';

async function login(request, env) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD is not set in Cloudflare.' }, 503);
  const ih = await ipHash(request, env);
  const c = await env.DB.prepare('SELECT COUNT(*) AS c FROM login_attempts WHERE ip_hash=? AND ts>?').bind(ih, now() - 600).first();
  if (c && c.c >= 5) return json({ error: 'Too many attempts. Try again in 10 minutes.' }, 429);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const ok = eq(await sha(String(b.password || '')), await sha(env.ADMIN_PASSWORD));
  if (!ok) {
    await env.DB.prepare('INSERT INTO login_attempts(ip_hash,ts) VALUES(?,?)').bind(ih, now()).run();
    return json({ error: 'Wrong password.' }, 401);
  }
  const t = await makeToken(env);
  return json({ ok: true }, 200, { 'Set-Cookie': `nier_admin=${t}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800` });
}

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return '"' + s.replace(/"/g, '""') + '"';
};

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '');
  const m = request.method;
  if (!env.DB) return json({ error: 'Database is not connected. Add the D1 binding named DB.' }, 503);
  if (path === 'login' && m === 'POST') return login(request, env);
  if (path === 'logout' && m === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': COOKIE_OFF });
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);
  if (m !== 'GET' && request.headers.get('X-Admin') !== '1') return json({ error: 'Bad request' }, 400);
  const DB = env.DB;
  try {
    if (path === 'me' && m === 'GET') {
      const q = await DB.prepare("SELECT COUNT(*) AS c FROM quotes WHERE status='new'").first();
      const t = await DB.prepare('SELECT COUNT(*) AS c FROM testimonials WHERE published=0').first();
      return json({ ok: true, newQuotes: q.c, pendingTestimonials: t.c });
    }
    // ---- quotes
    if (path === 'quotes' && m === 'GET') {
      const st = url.searchParams.get('status') || '', q = '%' + (url.searchParams.get('q') || '').trim() + '%';
      const { results } = await DB.prepare("SELECT id,created_at,name,company,contact,request_type,category,quantity,needed_by,details,status,notes FROM quotes WHERE (?1='' OR status=?1) AND (name LIKE ?2 OR company LIKE ?2 OR contact LIKE ?2 OR details LIKE ?2) ORDER BY id DESC LIMIT 500").bind(st, q).all();
      return json(results);
    }
    if (path === 'quotes.csv' && m === 'GET') {
      const { results } = await DB.prepare('SELECT id,created_at,name,company,contact,request_type,category,quantity,needed_by,details,status,notes FROM quotes ORDER BY id DESC').all();
      const head = ['ID', 'Date', 'Name', 'Company', 'Contact', 'Request type', 'Category', 'Quantity', 'Needed by', 'Details', 'Status', 'Notes'];
      const rows = results.map((r) => [r.id, new Date(r.created_at * 1000).toISOString(), r.name, r.company, r.contact, r.request_type, r.category, r.quantity, r.needed_by, r.details, r.status, r.notes].map(csvCell).join(','));
      return new Response('\ufeff' + [head.map(csvCell).join(','), ...rows].join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="quote-requests.csv"', 'Cache-Control': 'no-store' } });
    }
    let mm = path.match(/^quotes\/(\d+)$/);
    if (mm && m === 'PATCH') {
      const b = await request.json(), id = +mm[1];
      if (b.status !== undefined) {
        if (!STATUSES.includes(b.status)) return json({ error: 'Invalid status.' }, 400);
        await DB.prepare('UPDATE quotes SET status=? WHERE id=?').bind(b.status, id).run();
      }
      if (b.notes !== undefined) await DB.prepare('UPDATE quotes SET notes=? WHERE id=?').bind(clean(b.notes, 2000), id).run();
      return json({ ok: true });
    }
    if (mm && m === 'DELETE') { await DB.prepare('DELETE FROM quotes WHERE id=?').bind(+mm[1]).run(); return json({ ok: true }); }
    // ---- testimonials
    if (path === 'testimonials' && m === 'GET') {
      const { results } = await DB.prepare('SELECT id,created_at,name,role,rating,message,photo,published,source FROM testimonials ORDER BY published ASC, id DESC LIMIT 300').all();
      return json(results);
    }
    if (path === 'testimonials' && m === 'POST') {
      const f = await request.formData();
      const name = clean(f.get('name'), 80), message = clean(f.get('message'), 800);
      if (!name || !message) return json({ error: 'Name and message are required.' }, 400);
      const photo = await saveImage(env, f.get('photo'));
      await DB.prepare("INSERT INTO testimonials(created_at,name,role,rating,message,photo,published,source) VALUES(?,?,?,?,?,?,?,'admin')")
        .bind(now(), name, clean(f.get('role'), 100), Math.min(5, Math.max(1, parseInt(f.get('rating'), 10) || 5)), message, photo, f.get('published') === '0' ? 0 : 1).run();
      return json({ ok: true }, 201);
    }
    mm = path.match(/^testimonials\/(\d+)$/);
    if (mm && m === 'PUT') {
      const id = +mm[1], f = await request.formData();
      const cur = await DB.prepare('SELECT photo FROM testimonials WHERE id=?').bind(id).first();
      if (!cur) return json({ error: 'Not found.' }, 404);
      const name = clean(f.get('name'), 80), message = clean(f.get('message'), 800);
      if (!name || !message) return json({ error: 'Name and message are required.' }, 400);
      let photo = cur.photo;
      const np = await saveImage(env, f.get('photo'));
      if (np) { await dropImage(env, photo); photo = np; } else if (f.get('remove_photo') === '1') { await dropImage(env, photo); photo = null; }
      await DB.prepare('UPDATE testimonials SET name=?,role=?,rating=?,message=?,photo=?,published=? WHERE id=?')
        .bind(name, clean(f.get('role'), 100), Math.min(5, Math.max(1, parseInt(f.get('rating'), 10) || 5)), message, photo, f.get('published') === '0' ? 0 : 1, id).run();
      return json({ ok: true });
    }
    if (mm && m === 'PATCH') {
      const b = await request.json();
      await DB.prepare('UPDATE testimonials SET published=? WHERE id=?').bind(b.published ? 1 : 0, +mm[1]).run();
      return json({ ok: true });
    }
    if (mm && m === 'DELETE') {
      const cur = await DB.prepare('SELECT photo FROM testimonials WHERE id=?').bind(+mm[1]).first();
      if (cur) await dropImage(env, cur.photo);
      await DB.prepare('DELETE FROM testimonials WHERE id=?').bind(+mm[1]).run();
      return json({ ok: true });
    }
    // ---- gallery
    if (path === 'gallery' && m === 'GET') {
      const { results } = await DB.prepare('SELECT id,created_at,caption,category,image,width,height,published FROM gallery ORDER BY id DESC LIMIT 300').all();
      return json(results);
    }
    if (path === 'gallery' && m === 'POST') {
      const f = await request.formData();
      const image = await saveImage(env, f.get('file'));
      if (!image) return json({ error: 'Please choose a photo.' }, 400);
      const cat = CATS.includes(f.get('category')) ? f.get('category') : 'Company';
      await DB.prepare('INSERT INTO gallery(created_at,caption,category,image,width,height,published) VALUES(?,?,?,?,?,?,?)')
        .bind(now(), clean(f.get('caption'), 160), cat, image, parseInt(f.get('width'), 10) || 800, parseInt(f.get('height'), 10) || 800, f.get('published') === '0' ? 0 : 1).run();
      return json({ ok: true }, 201);
    }
    mm = path.match(/^gallery\/(\d+)$/);
    if (mm && m === 'PATCH') {
      const b = await request.json(), id = +mm[1];
      if (b.published !== undefined) await DB.prepare('UPDATE gallery SET published=? WHERE id=?').bind(b.published ? 1 : 0, id).run();
      if (b.caption !== undefined) await DB.prepare('UPDATE gallery SET caption=? WHERE id=?').bind(clean(b.caption, 160), id).run();
      if (b.category !== undefined && CATS.includes(b.category)) await DB.prepare('UPDATE gallery SET category=? WHERE id=?').bind(b.category, id).run();
      return json({ ok: true });
    }
    if (mm && m === 'DELETE') {
      const cur = await DB.prepare('SELECT image FROM gallery WHERE id=?').bind(+mm[1]).first();
      if (cur) await dropImage(env, cur.image);
      await DB.prepare('DELETE FROM gallery WHERE id=?').bind(+mm[1]).run();
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 400);
  }
}
