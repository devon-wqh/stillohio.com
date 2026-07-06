document.addEventListener('DOMContentLoaded', () => {
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
