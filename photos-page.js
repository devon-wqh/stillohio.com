function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function loadPhotos() {
  const id = new URLSearchParams(location.search).get('id');
  const titleEl = document.getElementById('p-title');
  const subEl = document.getElementById('p-sub');
  const grid = document.getElementById('photo-grid');
  const back = document.getElementById('p-back');
  if (!id) { titleEl.textContent = 'Archive not found'; return; }

  back.href = `screening?id=${encodeURIComponent(id)}`;

  let data;
  try {
    const res = await fetch(`/api/screenings/${encodeURIComponent(id)}`);
    data = await res.json();
  } catch {
    titleEl.textContent = 'Unable to load this archive.';
    return;
  }
  if (!data.ok) { titleEl.textContent = 'Archive not found'; return; }

  const s = data.screening;
  const label = s.badge ? `${s.badge} · ${s.display_date}` : s.display_date;
  titleEl.textContent = label;
  document.title = `${label} — Photo Archive — Still Ohio`;
  subEl.textContent = `${s.town}${s.venue ? ' — ' + s.venue : ''}`;

  if (!data.photos.length) {
    grid.innerHTML = '';
    const note = document.createElement('p');
    note.className = 'copy';
    note.textContent = 'Photos from this screening will be posted here soon.';
    grid.replaceWith(note);
    return;
  }

  data.photos.forEach(p => {
    const fig = document.createElement('a');
    fig.className = 'photo-item';
    fig.href = p.url;
    fig.target = '_blank';
    fig.rel = 'noopener';
    fig.innerHTML = `<img src="${esc(p.url)}" alt="${esc(p.caption || 'Screening photo')}" loading="lazy">`;
    grid.appendChild(fig);
  });
}

document.addEventListener('DOMContentLoaded', loadPhotos);
