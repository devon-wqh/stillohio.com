function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// A date range when display_date_end is set (exact day still unknown),
// otherwise just the single date label.
function dateLabel(s) {
  return s.display_date_end ? `${s.display_date} – ${s.display_date_end}` : s.display_date;
}

function tileInner(s) {
  // Event title is the headline; when it's absent (older records) the town takes
  // its place. When a title is present the town shows as a line beneath it, even
  // if the two overlap.
  const heading = s.title || s.town;
  const badge = s.badge ? `<span class="badge">${esc(s.badge)}</span>` : '';
  const townLine = s.title ? `<p class="venue">${esc(s.town)}</p>` : '';
  const venue = s.venue ? `<p class="venue">${esc(s.venue)}</p>` : '';
  return `${badge}
    <div class="date">${esc(dateLabel(s))}</div>
    <div class="details">
      <h3 class="town">${esc(heading)}</h3>
      ${townLine}
      ${venue}
    </div>`;
}

function upcomingTile(s) {
  const a = document.createElement('a');
  a.className = 'screening';
  a.href = `screening?id=${s.id}`;
  a.innerHTML = tileInner(s);
  return a;
}

function pastTile(s) {
  const wrap = document.createElement('div');
  wrap.className = 'screening-wrap';
  wrap.innerHTML = `
    <a class="screening" href="screening?id=${s.id}">${tileInner(s)}</a>
    <a class="button photo-archive-btn" href="photos?id=${s.id}">Photo archive</a>`;
  return wrap;
}

async function loadScreenings() {
  const upcomingList = document.getElementById('upcoming-list');
  const pastList = document.getElementById('past-list');
  const pastSection = document.getElementById('past-section');

  let data;
  try {
    const res = await fetch('/api/screenings');
    data = await res.json();
  } catch {
    upcomingList.innerHTML = '<p class="copy">Unable to load screenings right now.</p>';
    return;
  }
  if (!data.ok) return;

  const upcoming = data.screenings
    .filter(s => s.status !== 'past')
    .sort((a, b) => (a.sort_date || '9999').localeCompare(b.sort_date || '9999'));
  const past = data.screenings
    .filter(s => s.status === 'past')
    .sort((a, b) => (b.sort_date || '').localeCompare(a.sort_date || ''));

  if (upcoming.length) {
    upcoming.forEach(s => upcomingList.appendChild(upcomingTile(s)));
  } else {
    upcomingList.innerHTML = '<p class="copy">No upcoming screenings announced yet — check back soon.</p>';
  }

  if (past.length) {
    past.forEach(s => pastList.appendChild(pastTile(s)));
    pastSection.hidden = false;
  }
}

document.addEventListener('DOMContentLoaded', loadScreenings);
