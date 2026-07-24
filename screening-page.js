function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function wireModal(screeningId) {
  const overlay = document.getElementById('keep-updated-overlay');
  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('keep-updated-form');
  const status = document.getElementById('modal-status');
  const openBtn = document.getElementById('keep-updated-btn');
  if (!openBtn) return;

  const open = () => {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    form.querySelector('input[name="name"]').focus();
  };
  const close = () => {
    overlay.hidden = true;
    document.body.style.overflow = '';
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.type = 'event';
    data.event = `screening-${screeningId}`;
    status.textContent = 'Submitting…';
    try {
      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('failed');
      status.textContent = "Thanks — we'll be in touch.";
      form.reset();
      setTimeout(close, 1800);
    } catch {
      status.textContent = 'Something went wrong. Please try again.';
    }
  });
}

async function loadScreening() {
  const id = new URLSearchParams(location.search).get('id');
  const titleEl = document.getElementById('s-title');
  if (!id) { titleEl.textContent = 'Screening not found'; return; }

  let data;
  try {
    const res = await fetch(`/api/screenings/${encodeURIComponent(id)}`);
    data = await res.json();
  } catch {
    titleEl.textContent = 'Unable to load this screening.';
    return;
  }
  if (!data.ok) { titleEl.textContent = 'Screening not found'; return; }

  const s = data.screening;
  document.title = `${s.display_date} · ${s.town} — Still Ohio`;

  const badgeEl = document.getElementById('s-badge');
  if (s.badge) { badgeEl.textContent = s.badge; badgeEl.hidden = false; }

  titleEl.textContent = s.time ? `${s.display_date} · ${s.time}` : s.display_date;
  document.getElementById('s-town').textContent = s.town;
  document.getElementById('s-venue').textContent = s.venue || '';

  const cta = document.getElementById('s-cta');
  if (s.cta_type === 'tickets' && s.ticket_url) {
    cta.innerHTML = `<a class="button" href="${esc(s.ticket_url)}" target="_blank" rel="noopener">Get tickets</a>`;
  } else if (s.cta_type === 'updates') {
    cta.innerHTML = `<button class="button" id="keep-updated-btn" type="button">Keep me updated</button>`;
    wireModal(s.id);
  }
}

document.addEventListener('DOMContentLoaded', loadScreening);
