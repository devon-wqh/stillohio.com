-- Characters visitors build at the end of the game. They appear at the first
-- gas station for everyone who plays. One per email (resubmitting updates it);
-- hidden lets the dashboard pull a character without deleting it.
CREATE TABLE characters (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,           -- stored lowercased
  name       TEXT    NOT NULL,                  -- shown above the character's head
  config     TEXT    NOT NULL,                  -- JSON: shirt, pattern, colours, hair, height, glasses
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

CREATE INDEX idx_characters_visible ON characters(hidden, updated_at);
