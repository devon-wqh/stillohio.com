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
});
