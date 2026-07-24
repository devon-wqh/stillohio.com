-- Screenings: one row per screening/event.
-- sort_date is an ISO yyyy-mm-dd used for ordering and the map; display_date
-- is the human-facing label so vague entries like "October 2026" still work.
CREATE TABLE screenings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  display_date TEXT    NOT NULL,
  sort_date    TEXT,                              -- ISO yyyy-mm-dd, nullable for TBA
  time         TEXT,                              -- e.g. "3:00 PM"
  town         TEXT    NOT NULL,                  -- e.g. "Waterville, Maine"
  venue        TEXT,                              -- venue / detail line
  badge        TEXT,                              -- e.g. "World Premiere"
  lat          REAL,                              -- map marker
  lng          REAL,
  cta_type     TEXT    NOT NULL DEFAULT 'updates',-- tickets | updates | none
  ticket_url   TEXT,                              -- when cta_type = tickets
  status       TEXT    NOT NULL DEFAULT 'upcoming', -- upcoming | past
  tickets_sold INTEGER,                           -- volume, nullable
  gross_cents  INTEGER,                           -- gross revenue in cents, nullable
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Photos attached to a screening (archive). url may be an R2 public URL or an
-- external link — both are stored the same way.
CREATE TABLE photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  screening_id INTEGER NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  url          TEXT    NOT NULL,
  caption      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_screenings_status ON screenings(status);
CREATE INDEX idx_screenings_sort_date ON screenings(sort_date);
CREATE INDEX idx_photos_screening ON photos(screening_id);
