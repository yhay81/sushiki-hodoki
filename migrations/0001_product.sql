CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(name IN ('visited', 'analyzed', 'example_opened', 'diagnosis_viewed', 'structure_viewed', 'question_copied', 'official_source_opened', 'returned')),
  session_hash TEXT NOT NULL CHECK(length(session_hash) = 64),
  detail TEXT CHECK(detail IS NULL OR detail IN ('clean', 'notice', 'warning', 'if', 'xlookup', 'vlookup', 'sumifs', 'countifs', 'filter', 'let', 'iferror', 'text', 'date', 'div0', 'na', 'name', 'ref', 'value', 'spill', 'calc')),
  day TEXT NOT NULL CHECK(length(day) = 10),
  is_qa INTEGER NOT NULL DEFAULT 0 CHECK(is_qa IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT(unixepoch())
);

CREATE INDEX product_events_metric_idx ON product_events(is_qa, name, day, session_hash);
