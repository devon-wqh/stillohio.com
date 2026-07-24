document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('keep-updated-btn');
  const overlay = document.getElementById('keep-updated-overlay');
  if (!btn || !overlay) return;

  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('keep-updated-form');
  const status = document.getElementById('modal-status');
  const eventId = btn.dataset.event || '';

  function open() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    form.querySelector('input[name="name"]').focus();
  }
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.type = 'event';
    data.event = eventId;

    status.textContent = 'Submitting…';
    try {
      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('request failed');
      status.textContent = "Thanks — we'll be in touch.";
      form.reset();
      setTimeout(close, 1800);
    } catch {
      status.textContent = 'Something went wrong. Please try again.';
    }
  });
});
