const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/updates') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed.' }, 405);
      }
      return handleUpdatesSignup(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
