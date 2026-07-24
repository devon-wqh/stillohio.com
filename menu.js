async function loadPartial(elementId, url) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const res = await fetch(url);
  el.outerHTML = await res.text();
}

Promise.all([
  loadPartial('header-placeholder', 'header.html'),
  loadPartial('footer-placeholder', 'footer.html'),
]).then(() => {
  const btn = document.getElementById('menu-toggle');
  const menu = document.getElementById('site-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  const mailForm = document.getElementById('footer-mailing-form');
  const mailInput = document.getElementById('footer-email-input');
  const mailStatus = document.getElementById('footer-mailing-status');
  if (mailForm && mailInput) {
    mailForm.addEventListener('submit', async e => {
      e.preventDefault();

      if (!mailForm.classList.contains('revealed')) {
        mailForm.classList.add('revealed');
        mailInput.removeAttribute('aria-hidden');
        mailInput.removeAttribute('tabindex');
        mailInput.focus();
        return;
      }

      if (!mailInput.value || !mailInput.checkValidity()) {
        mailInput.reportValidity();
        return;
      }

      mailStatus.textContent = 'Submitting…';
      try {
        const res = await fetch('/api/updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'footer', email: mailInput.value }),
        });
        if (!res.ok) throw new Error('request failed');
        mailStatus.textContent = "Thanks — we'll keep you posted.";
        mailForm.reset();
      } catch {
        mailStatus.textContent = 'Something went wrong. Please try again.';
      }
    });
  }
});
