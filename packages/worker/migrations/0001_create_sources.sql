-- Migration: Create sources table
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  protocol TEXT NOT NULL,
  connection TEXT NOT NULL,
  has_thumbnail INTEGER DEFAULT 0,
  thumbnail_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
