-- Seed the five screenings that currently exist as static pages.
-- IDs intentionally match the old screening-N.html numbering so redirects
-- from the old URLs land on the right record.
INSERT INTO screenings
  (id, display_date, sort_date, time, town, venue, badge, lat, lng, cta_type, ticket_url, status)
VALUES
  (1, 'July 12, 2026', '2026-07-12', '3:00 PM', 'Waterville, Maine',
   'Maine Film Center · Maine International Film Festival', 'World Premiere',
   44.5520, -69.6317, 'tickets',
   'https://miff29.eventive.org/schedule/still-ohio-shown-with-final-girls-6a21ce4e52b0db5d1d3824e5',
   'past'),
  (2, 'July 17, 2026', '2026-07-17', '9:00 PM', 'Waterville, Maine',
   'Maine Film Center · Maine International Film Festival', 'Full Cast in Attendance',
   44.5520, -69.6317, 'tickets',
   'https://miff29.eventive.org/schedule/still-ohio-shown-with-final-girls-6a21ce4e52b0db5d1d38253a',
   'past'),
  (3, 'September 11, 2026', '2026-09-11', NULL, 'Ohio',
   'Details to be announced.', NULL,
   40.4173, -82.9071, 'updates', NULL, 'upcoming'),
  (4, 'October 2026', '2026-10-01', NULL, 'California',
   'Venue TBA — date to be announced.', NULL,
   36.7783, -119.4179, 'updates', NULL, 'upcoming'),
  (5, 'September 18, 2026', '2026-09-18', NULL, 'Ohio',
   'Details to be announced.', NULL,
   40.4173, -82.9071, 'updates', NULL, 'upcoming');
