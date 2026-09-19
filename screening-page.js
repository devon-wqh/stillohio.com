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

// Some festivals sell by screening block and their ticket page can't preselect
// one from the URL, so confirm which block the film is in before handing the
// visitor off. The trigger is a <button>, not a link: it deliberately carries no
// href, so there's no way to reach the ticket site without passing the notice.
// The confirm control inside the dialog is the only outbound path.
function wireBlockNotice(trigger, ticketUrl, block, price) {
  const overlay = document.getElementById('block-notice-overlay');
  const closeBtn = document.getElementById('block-notice-close');
  const go = document.getElementById('block-notice-go');
  if (!overlay || !trigger) return;

  document.getElementById('block-notice-name').textContent = block;
  document.getElementById('block-notice-go-label').textContent = block;
  go.href = ticketUrl;

  // Price is optional — the line stays hidden for festivals that haven't set one.
  if (price) {
    document.getElementById('block-notice-price').textContent = price;
    document.getElementById('block-notice-price-line').hidden = false;
  }

  const close = () => {
    overlay.hidden = true;
    document.body.style.overflow = '';
  };

  trigger.addEventListener('click', () => {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    go.focus();
  });
  go.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });
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
  const dateLabel = s.display_date_end ? `${s.display_date} – ${s.display_date_end}` : s.display_date;
  const heading = s.title || s.town;
  document.title = `${heading} — Still Ohio`;

  const badgeEl = document.getElementById('s-badge');
  if (s.badge) { badgeEl.textContent = s.badge; badgeEl.hidden = false; }

  titleEl.textContent = heading;
  document.getElementById('s-date').textContent = s.time ? `${dateLabel} · ${s.time}` : dateLabel;
  // Town shows as a sub-line only when a distinct title is the heading.
  const townEl = document.getElementById('s-town');
  if (s.title) { townEl.textContent = s.town; townEl.hidden = false; }
  document.getElementById('s-venue').textContent = s.venue || '';

  const cta = document.getElementById('s-cta');
  if (s.cta_type === 'tickets' && s.ticket_url && s.ticket_block) {
    // Pure trigger — no href to cmd-click or "open in new tab" around.
    cta.innerHTML = `<button class="button" id="tickets-btn" type="button">Get tickets</button>`;
    wireBlockNotice(document.getElementById('tickets-btn'), s.ticket_url, s.ticket_block, s.ticket_price);
  } else if (s.cta_type === 'tickets' && s.ticket_url) {
    cta.innerHTML = `<a class="button" href="${esc(s.ticket_url)}" target="_blank" rel="noopener">Get tickets</a>`;
  } else if (s.cta_type === 'updates') {
    cta.innerHTML = `<button class="button" id="keep-updated-btn" type="button">Keep me updated</button>`;
    wireModal(s.id);
  }
}

document.addEventListener('DOMContentLoaded', loadScreening);
