'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  pw_hash       TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until  INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS pitches (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, role TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
  city TEXT NOT NULL, linkedin TEXT, startup TEXT NOT NULL, sector TEXT NOT NULL,
  stage TEXT NOT NULL, oneliner TEXT NOT NULL, problem TEXT NOT NULL,
  team INTEGER, ask_lakh REAL, deck TEXT NOT NULL, video TEXT, why TEXT NOT NULL, source TEXT,
  status     TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('review','shortlisted','rejected')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pitches_user ON pitches(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,           -- Razorpay order id
  user_id        INTEGER NOT NULL REFERENCES users(id),
  tier           TEXT NOT NULL,
  qty            INTEGER NOT NULL,
  unit_price     INTEGER NOT NULL,           -- paise
  promo          TEXT,
  discount_pct   INTEGER NOT NULL DEFAULT 0,
  subtotal       INTEGER NOT NULL,           -- paise
  discount       INTEGER NOT NULL,
  gst            INTEGER NOT NULL,
  total          INTEGER NOT NULL,
  attendee_name  TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  payment_id     TEXT UNIQUE,
  created_at     INTEGER NOT NULL,
  paid_at        INTEGER
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS tickets (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL UNIQUE REFERENCES orders(id),
  user_id       INTEGER NOT NULL REFERENCES users(id),
  tier          TEXT NOT NULL,
  qty           INTEGER NOT NULL,
  attendee_name TEXT NOT NULL,
  checked_in_at INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tickets_user ON tickets(user_id);

CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY COLLATE NOCASE,
  created_at INTEGER NOT NULL
);
`);

// Housekeeping: drop expired sessions once an hour.
const purge = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
setInterval(() => purge.run(Date.now()), 60 * 60 * 1000).unref();

module.exports = db;
