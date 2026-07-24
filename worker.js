const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Public-facing screening shape — omits internal sales figures.
function publicScreening(row) {
  return {
    id: row.id,
    display_date: row.display_date,
    sort_date: row.sort_date,
    time: row.time,
    town: row.town,
    venue: row.venue,
    badge: row.badge,
    lat: row.lat,
    lng: row.lng,
    cta_type: row.cta_type,
    ticket_url: row.ticket_url,
    status: row.status,
  };
}

// Cloudflare Access injects this header for authenticated users and strips any
// client-supplied copy, so on Access-gated routes its presence means the caller
// passed the Access login. Localhost has no Access in front, so allow dev there.
function requireAdmin(request, url) {
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return request.headers.get('Cf-Access-Authenticated-User-Email') || 'dev@localhost';
  }
  return request.headers.get('Cf-Access-Authenticated-User-Email') || null;
}

// ---- Signups (public) --------------------------------------------------------

async function handleUpdatesSignup(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  const type = body.type === 'event' ? 'event' : 'footer';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const zip = typeof body.zip === 'string' ? body.zip.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const event = typeof body.event === 'string' ? body.event.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'A valid email is required.' }, 400);
  }
  if (type === 'event' && (!name || !zip)) {
    return json({ ok: false, error: 'Name and zip code are required.' }, 400);
  }

  const record = {
    type,
    name: name || null,
    email,
    zip: zip || null,
    phone: phone || null,
    event: event || null,
    submittedAt: new Date().toISOString(),
  };

  const key = `signup:${Date.now()}:${crypto.randomUUID()}`;
  await env.SIGNUPS.put(key, JSON.stringify(record));
  return json({ ok: true });
}

// ---- Screenings (public reads) ----------------------------------------------

async function listScreeningsPublic(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM screenings ORDER BY sort_date IS NULL, sort_date`
  ).all();
  return json({ ok: true, screenings: results.map(publicScreening) });
}

async function getScreeningPublic(env, id) {
  const row = await env.DB.prepare(`SELECT * FROM screenings WHERE id = ?`).bind(id).first();
  if (!row) return json({ ok: false, error: 'Not found.' }, 404);
  const { results: photos } = await env.DB.prepare(
    `SELECT id, url, caption FROM photos WHERE screening_id = ? ORDER BY sort_order, id`
  ).bind(id).all();
  return json({ ok: true, screening: publicScreening(row), photos });
}

// ---- Admin: screenings CRUD --------------------------------------------------

function readScreeningInput(body) {
  const s = {
    display_date: (body.display_date || '').trim(),
    sort_date: (body.sort_date || '').trim() || null,
    time: (body.time || '').trim() || null,
    town: (body.town || '').trim(),
    venue: (body.venue || '').trim() || null,
    badge: (body.badge || '').trim() || null,
    lat: body.lat === '' || body.lat == null ? null : Number(body.lat),
    lng: body.lng === '' || body.lng == null ? null : Number(body.lng),
    cta_type: ['tickets', 'updates', 'none'].includes(body.cta_type) ? body.cta_type : 'updates',
    ticket_url: (body.ticket_url || '').trim() || null,
    status: body.status === 'past' ? 'past' : 'upcoming',
    tickets_sold: body.tickets_sold === '' || body.tickets_sold == null ? null : Math.round(Number(body.tickets_sold)),
    gross_cents: body.gross_dollars === '' || body.gross_dollars == null ? null : Math.round(Number(body.gross_dollars) * 100),
  };
  return s;
}

async function createScreening(request, env) {
  const body = await request.json().catch(() => ({}));
  const s = readScreeningInput(body);
  if (!s.display_date || !s.town) {
    return json({ ok: false, error: 'Date label and town are required.' }, 400);
  }
  const res = await env.DB.prepare(
    `INSERT INTO screenings
      (display_date, sort_date, time, town, venue, badge, lat, lng, cta_type, ticket_url, status, tickets_sold, gross_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    s.display_date, s.sort_date, s.time, s.town, s.venue, s.badge,
    s.lat, s.lng, s.cta_type, s.ticket_url, s.status, s.tickets_sold, s.gross_cents
  ).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

async function updateScreening(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const s = readScreeningInput(body);
  if (!s.display_date || !s.town) {
    return json({ ok: false, error: 'Date label and town are required.' }, 400);
  }
  await env.DB.prepare(
    `UPDATE screenings SET
      display_date = ?, sort_date = ?, time = ?, town = ?, venue = ?, badge = ?,
      lat = ?, lng = ?, cta_type = ?, ticket_url = ?, status = ?, tickets_sold = ?, gross_cents = ?
     WHERE id = ?`
  ).bind(
    s.display_date, s.sort_date, s.time, s.town, s.venue, s.badge,
    s.lat, s.lng, s.cta_type, s.ticket_url, s.status, s.tickets_sold, s.gross_cents, id
  ).run();
  return json({ ok: true });
}

async function deleteScreening(env, id) {
  await env.DB.prepare(`DELETE FROM screenings WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

async function listScreeningsAdmin(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM screenings ORDER BY sort_date IS NULL, sort_date`
  ).all();
  return json({ ok: true, screenings: results });
}

async function adminSummary(env) {
  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total_screenings,
       SUM(CASE WHEN status = 'past' THEN 1 ELSE 0 END) AS past_count,
       SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END) AS upcoming_count,
       COALESCE(SUM(tickets_sold), 0) AS total_tickets,
       COALESCE(SUM(gross_cents), 0) AS total_gross_cents
     FROM screenings`
  ).first();
  const signupCount = await countSignups(env);
  return json({ ok: true, summary: { ...totals, signup_count: signupCount } });
}

// ---- Admin: signups (email list) --------------------------------------------

async function countSignups(env) {
  let count = 0;
  let cursor;
  do {
    const list = await env.SIGNUPS.list({ cursor });
    count += list.keys.length;
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return count;
}

async function listSignups(env) {
  const records = [];
  let cursor;
  do {
    const list = await env.SIGNUPS.list({ cursor });
    for (const k of list.keys) {
      const val = await env.SIGNUPS.get(k.name);
      if (val) {
        try { records.push({ key: k.name, ...JSON.parse(val) }); } catch {}
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  records.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return json({ ok: true, signups: records });
}

// ---- Admin: photos -----------------------------------------------------------

async function listPhotos(env, screeningId) {
  const { results } = await env.DB.prepare(
    `SELECT id, screening_id, url, caption, sort_order FROM photos WHERE screening_id = ? ORDER BY sort_order, id`
  ).bind(screeningId).all();
  return json({ ok: true, photos: results });
}

async function addPhoto(request, env) {
  const body = await request.json().catch(() => ({}));
  const screeningId = Number(body.screening_id);
  const url = (body.url || '').trim();
  const caption = (body.caption || '').trim() || null;
  if (!screeningId || !url) {
    return json({ ok: false, error: 'screening_id and url are required.' }, 400);
  }
  const res = await env.DB.prepare(
    `INSERT INTO photos (screening_id, url, caption) VALUES (?, ?, ?)`
  ).bind(screeningId, url, caption).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

async function deletePhoto(env, id) {
  await env.DB.prepare(`DELETE FROM photos WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

// Upload a file to R2 (only when the PHOTOS bucket binding exists). Returns a
// public URL served back through GET /photos/<key>.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

async function uploadPhoto(request, env, url) {
  if (!env.PHOTOS) {
    return json({ ok: false, error: 'Photo storage (R2) is not enabled yet. Use "link a URL" instead.' }, 503);
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return json({ ok: false, error: 'No file provided.' }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ ok: false, error: 'Photo is larger than 10 MB. Please upload a smaller file.' }, 413);
  }
  if (!(file.type || '').startsWith('image/')) {
    return json({ ok: false, error: 'Only image files can be uploaded.' }, 400);
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  const publicUrl = `${url.origin}/photos/${key}`;
  return json({ ok: true, url: publicUrl });
}

async function servePhoto(env, key) {
  if (!env.PHOTOS) return new Response('Not found', { status: 404 });
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}

// ---- Router ------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Public signup
    if (path === '/api/updates') {
      if (method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return handleUpdatesSignup(request, env);
    }

    // Public screenings reads
    if (path === '/api/screenings' && method === 'GET') {
      return listScreeningsPublic(env);
    }
    const pubMatch = path.match(/^\/api\/screenings\/(\d+)$/);
    if (pubMatch && method === 'GET') {
      return getScreeningPublic(env, Number(pubMatch[1]));
    }

    // R2-served photos
    if (path.startsWith('/photos/')) {
      return servePhoto(env, path.slice('/photos/'.length));
    }

    // Admin API (Access-gated in production; localhost bypass for dev)
    if (path.startsWith('/api/admin/')) {
      const who = requireAdmin(request, url);
      if (!who) return json({ ok: false, error: 'Unauthorized.' }, 403);

      if (path === '/api/admin/summary' && method === 'GET') return adminSummary(env);
      if (path === '/api/admin/signups' && method === 'GET') return listSignups(env);

      if (path === '/api/admin/screenings' && method === 'GET') return listScreeningsAdmin(env);
      if (path === '/api/admin/screenings' && method === 'POST') return createScreening(request, env);
      const adminScr = path.match(/^\/api\/admin\/screenings\/(\d+)$/);
      if (adminScr && method === 'PUT') return updateScreening(request, env, Number(adminScr[1]));
      if (adminScr && method === 'DELETE') return deleteScreening(env, Number(adminScr[1]));

      if (path === '/api/admin/photos' && method === 'GET') {
        return listPhotos(env, Number(url.searchParams.get('screening_id')));
      }
      if (path === '/api/admin/photos' && method === 'POST') return addPhoto(request, env);
      const adminPhoto = path.match(/^\/api\/admin\/photos\/(\d+)$/);
      if (adminPhoto && method === 'DELETE') return deletePhoto(env, Number(adminPhoto[1]));

      if (path === '/api/admin/upload' && method === 'POST') return uploadPhoto(request, env, url);

      return json({ ok: false, error: 'Not found.' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
