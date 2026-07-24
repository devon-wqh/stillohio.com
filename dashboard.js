const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function money(cents) {
  return '$' + ((cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---- Tabs -------------------------------------------------------------------

let mapInited = false;
function switchTab(name) {
  $$('.dash-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.dash-section').forEach(s => s.classList.toggle('active', s.id === `tab-${name}`));
  if (name === 'map') initMap();
}
$('#dash-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.dash-tab');
  if (tab) switchTab(tab.dataset.tab);
});

// ---- Overview ---------------------------------------------------------------

async function loadOverview() {
  const grid = $('#stat-grid');
  try {
    const { summary } = await api('/dashboard/api/summary');
    const cards = [
      { v: summary.total_screenings, l: 'Screenings total' },
      { v: summary.upcoming_count, l: 'Upcoming' },
      { v: summary.past_count, l: 'Past' },
      { v: (summary.total_tickets || 0).toLocaleString('en-US'), l: 'Tickets sold' },
      { v: money(summary.total_gross_cents), l: 'Gross to date' },
      { v: (summary.signup_count || 0).toLocaleString('en-US'), l: 'Email signups' },
    ];
    grid.innerHTML = cards.map(c =>
      `<div class="stat-card"><div class="stat-value">${esc(c.v)}</div><div class="stat-label">${esc(c.l)}</div></div>`
    ).join('');
  } catch (e) {
    grid.innerHTML = `<p class="dash-empty">Couldn't load stats: ${esc(e.message)}</p>`;
  }
}

// ---- Screenings -------------------------------------------------------------

let screeningsCache = [];

async function loadScreeningsAdmin() {
  const list = $('#screenings-admin-list');
  try {
    const { screenings } = await api('/dashboard/api/screenings');
    screeningsCache = screenings;
    if (!screenings.length) { list.innerHTML = '<p class="dash-empty">No screenings yet.</p>'; return; }
    list.innerHTML = screenings.map(s => {
      const sales = (s.tickets_sold != null || s.gross_cents != null)
        ? ` · ${s.tickets_sold || 0} sold · ${money(s.gross_cents)}` : '';
      return `<div class="admin-row" data-id="${s.id}">
        <div class="ar-main">
          <div class="ar-date">${esc(s.display_date)}</div>
          <div class="ar-town">${esc(s.town)}</div>
          <div class="ar-meta">${esc(s.venue || '')}${sales}</div>
        </div>
        <span class="ar-tag ${esc(s.status)}">${esc(s.status)}</span>
      </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = `<p class="dash-empty">Couldn't load screenings: ${esc(e.message)}</p>`;
  }
}

$('#screenings-admin-list').addEventListener('click', e => {
  const row = e.target.closest('.admin-row');
  if (row) openScreeningModal(screeningsCache.find(s => s.id === Number(row.dataset.id)));
});
$('#new-screening-btn').addEventListener('click', () => openScreeningModal(null));

const scrModal = $('#screening-modal');
const scrForm = $('#screening-form');

function openScreeningModal(s) {
  scrForm.reset();
  $('#screening-form-status').textContent = '';
  $('#screening-modal-title').textContent = s ? 'Edit screening' : 'New screening';
  $('#delete-screening-btn').hidden = !s;
  scrForm.id.value = s ? s.id : '';
  if (s) {
    scrForm.display_date.value = s.display_date || '';
    scrForm.sort_date.value = s.sort_date || '';
    scrForm.time.value = s.time || '';
    scrForm.town.value = s.town || '';
    scrForm.venue.value = s.venue || '';
    scrForm.badge.value = s.badge || '';
    scrForm.status.value = s.status || 'upcoming';
    scrForm.lat.value = s.lat != null ? s.lat : '';
    scrForm.lng.value = s.lng != null ? s.lng : '';
    scrForm.cta_type.value = s.cta_type || 'updates';
    scrForm.ticket_url.value = s.ticket_url || '';
    scrForm.tickets_sold.value = s.tickets_sold != null ? s.tickets_sold : '';
    scrForm.gross_dollars.value = s.gross_cents != null ? (s.gross_cents / 100) : '';
  }
  scrModal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeScreeningModal() {
  scrModal.hidden = true;
  document.body.style.overflow = '';
}
$('#screening-modal-close').addEventListener('click', closeScreeningModal);
scrModal.addEventListener('click', e => { if (e.target === scrModal) closeScreeningModal(); });

scrForm.addEventListener('submit', async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(scrForm).entries());
  const id = body.id;
  const status = $('#screening-form-status');
  status.textContent = 'Saving…';
  try {
    if (id) {
      await api(`/dashboard/api/screenings/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    } else {
      await api('/dashboard/api/screenings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    }
    closeScreeningModal();
    await Promise.all([loadScreeningsAdmin(), loadOverview(), populatePhotoSelect()]);
    refreshMapMarkers();
  } catch (err) {
    status.textContent = err.message;
  }
});

$('#delete-screening-btn').addEventListener('click', async () => {
  const id = scrForm.id.value;
  if (!id || !confirm('Delete this screening and its photos? This cannot be undone.')) return;
  try {
    await api(`/dashboard/api/screenings/${id}`, { method: 'DELETE' });
    closeScreeningModal();
    await Promise.all([loadScreeningsAdmin(), loadOverview(), populatePhotoSelect()]);
    refreshMapMarkers();
  } catch (err) {
    $('#screening-form-status').textContent = err.message;
  }
});

// ---- Photos -----------------------------------------------------------------

async function populatePhotoSelect() {
  const sel = $('#photo-screening-select');
  const prev = sel.value;
  if (!screeningsCache.length) {
    try { screeningsCache = (await api('/dashboard/api/screenings')).screenings; } catch {}
  }
  sel.innerHTML = screeningsCache.map(s =>
    `<option value="${s.id}">${esc(s.display_date)} — ${esc(s.town)}</option>`
  ).join('');
  if (prev) sel.value = prev;
  loadPhotoAdmin();
}
$('#photo-screening-select').addEventListener('change', loadPhotoAdmin);

async function loadPhotoAdmin() {
  const sel = $('#photo-screening-select');
  const grid = $('#photo-admin-list');
  const id = sel.value;
  if (!id) { grid.innerHTML = ''; return; }
  try {
    const { photos } = await api(`/dashboard/api/photos?screening_id=${id}`);
    if (!photos.length) { grid.innerHTML = '<p class="dash-empty">No photos yet for this screening.</p>'; return; }
    grid.innerHTML = photos.map(p =>
      `<div class="photo-admin-item"><img src="${esc(p.url)}" alt="${esc(p.caption || '')}">
        <button type="button" data-id="${p.id}" aria-label="Remove">&times;</button></div>`
    ).join('');
  } catch (e) {
    grid.innerHTML = `<p class="dash-empty">${esc(e.message)}</p>`;
  }
}
$('#photo-admin-list').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-id]');
  if (!btn || !confirm('Remove this photo?')) return;
  try { await api(`/dashboard/api/photos/${btn.dataset.id}`, { method: 'DELETE' }); loadPhotoAdmin(); }
  catch (err) { alert(err.message); }
});
$('#add-photo-link-btn').addEventListener('click', async () => {
  const screeningId = $('#photo-screening-select').value;
  const url = $('#photo-url-input').value.trim();
  const caption = $('#photo-caption-input').value.trim();
  if (!screeningId || !url) { alert('Pick a screening and enter an image URL.'); return; }
  try {
    await api('/dashboard/api/photos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screening_id: Number(screeningId), url, caption }),
    });
    $('#photo-url-input').value = ''; $('#photo-caption-input').value = '';
    loadPhotoAdmin();
  } catch (err) { alert(err.message); }
});
$('#upload-photo-btn').addEventListener('click', async () => {
  const screeningId = $('#photo-screening-select').value;
  const file = $('#photo-file-input').files[0];
  const hint = $('#upload-hint');
  if (!screeningId || !file) { alert('Pick a screening and choose a file.'); return; }
  if (file.size > 10 * 1024 * 1024) {
    hint.textContent = 'That photo is larger than 10 MB. Please choose a smaller file.';
    return;
  }
  hint.textContent = 'Uploading…';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { url } = await api('/dashboard/api/upload', { method: 'POST', body: fd });
    await api('/dashboard/api/photos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screening_id: Number(screeningId), url }),
    });
    hint.textContent = 'Uploaded.';
    $('#photo-file-input').value = '';
    loadPhotoAdmin();
  } catch (err) { hint.textContent = err.message; }
});

// ---- Emails -----------------------------------------------------------------

let signupsCache = [];
async function loadEmails() {
  const table = $('#emails-table');
  try {
    const { signups } = await api('/dashboard/api/signups');
    signupsCache = signups;
    if (!signups.length) { table.innerHTML = '<tr><td class="dash-empty">No signups yet.</td></tr>'; return; }
    const head = `<tr><th>Date</th><th>Type</th><th>Name</th><th>Email</th><th>Zip</th><th>Phone</th><th>Event</th></tr>`;
    const rows = signups.map(s => `<tr>
      <td>${esc((s.submittedAt || '').slice(0, 10))}</td>
      <td class="${s.type === 'event' ? 'tag-event' : ''}">${esc(s.type)}</td>
      <td>${esc(s.name || '')}</td>
      <td>${esc(s.email || '')}</td>
      <td>${esc(s.zip || '')}</td>
      <td>${esc(s.phone || '')}</td>
      <td>${esc(s.event || '')}</td>
    </tr>`).join('');
    table.innerHTML = head + rows;
  } catch (e) {
    table.innerHTML = `<tr><td class="dash-empty">Couldn't load: ${esc(e.message)}</td></tr>`;
  }
}
$('#export-emails-btn').addEventListener('click', () => {
  if (!signupsCache.length) return;
  const cols = ['submittedAt', 'type', 'name', 'email', 'zip', 'phone', 'event'];
  const csv = [cols.join(',')].concat(signupsCache.map(s =>
    cols.map(c => `"${String(s[c] == null ? '' : s[c]).replace(/"/g, '""')}"`).join(',')
  )).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `still-ohio-signups-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---- Map --------------------------------------------------------------------

let map, markerLayer;
function initMap() {
  if (mapInited) { map.invalidateSize(); return; }
  mapInited = true;
  map = L.map('dash-map', { scrollWheelZoom: false }).setView([39.5, -84], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 18,
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  refreshMapMarkers();
}
async function refreshMapMarkers() {
  if (!mapInited || !markerLayer) return;
  if (!screeningsCache.length) {
    try { screeningsCache = (await api('/dashboard/api/screenings')).screenings; } catch { return; }
  }
  markerLayer.clearLayers();
  const pts = [];
  screeningsCache.forEach(s => {
    if (s.lat == null || s.lng == null) return;
    const color = s.status === 'past' ? '#b6aa93' : '#ffcc00';
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 8, color, fillColor: color, fillOpacity: 0.7, weight: 2,
    }).bindPopup(
      `<strong>${esc(s.display_date)}</strong><br>${esc(s.town)}<br>${esc(s.venue || '')}` +
      (s.tickets_sold != null ? `<br>${s.tickets_sold} sold` : '')
    );
    marker.addTo(markerLayer);
    pts.push([s.lat, s.lng]);
  });
  if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 7 });
}

// ---- Identity + init --------------------------------------------------------

async function showUser() {
  try {
    const res = await fetch('/cdn-cgi/access/get-identity');
    if (res.ok) {
      const id = await res.json();
      if (id && id.email) $('#dash-user').textContent = id.email;
    }
  } catch {}
}

showUser();
loadOverview();
loadScreeningsAdmin();
populatePhotoSelect();
loadEmails();
