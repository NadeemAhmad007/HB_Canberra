-- Houseboat Canberra — Neon Database Schema
-- Run this once to set up the database.

-- ── Property config (synced from Google Sheets) ─────────────────────────
CREATE TABLE IF NOT EXISTS property_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Rooms (synced from Google Sheets Room_Inventory + Base_Rates) ──────
CREATE TABLE IF NOT EXISTS rooms (
  id         INT PRIMARY KEY,
  name       TEXT NOT NULL,
  units      INT NOT NULL DEFAULT 1,
  base_price INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Seasonal multipliers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id          SERIAL PRIMARY KEY,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  multiplier  NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seasons_dates ON seasons (start_date, end_date);

-- ── Meal plans ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INT NOT NULL DEFAULT 0
);

-- ── Calendar block map ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_block_map (
  id          SERIAL PRIMARY KEY,
  room_id     INT NOT NULL REFERENCES rooms(id),
  calendar_id TEXT NOT NULL
);

CREATE INDEX idx_calendar_room ON calendar_block_map (room_id);

-- ── Blocked dates (synced from Google Calendar) ─────────────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  id       SERIAL PRIMARY KEY,
  room_id  INT NOT NULL REFERENCES rooms(id),
  date     DATE NOT NULL,
  UNIQUE(room_id, date)
);

CREATE INDEX idx_blocked_dates_room ON blocked_dates (room_id, date);

-- ── Bookings (written by Stripe webhook, read by website) ──────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref          TEXT NOT NULL DEFAULT '',
  guest_name           TEXT NOT NULL DEFAULT '',
  phone                TEXT NOT NULL DEFAULT '',
  email                TEXT NOT NULL DEFAULT '',
  room_id              INT NOT NULL REFERENCES rooms(id),
  meal_code            TEXT DEFAULT '',
  adults               INT NOT NULL DEFAULT 1,
  check_in             DATE NOT NULL,
  check_out            DATE NOT NULL,
  nights               INT NOT NULL,
  amount               INT NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'INR',
  stripe_payment_intent TEXT DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'pending',
  invoice_url          TEXT DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_email   ON bookings (email);
CREATE INDEX idx_bookings_dates   ON bookings (check_in, check_out);
CREATE INDEX idx_bookings_status  ON bookings (status);

-- ── Sync log (track when Sheets data was last pulled) ──────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id         SERIAL PRIMARY KEY,
  source     TEXT NOT NULL DEFAULT 'google-sheets',
  status     TEXT NOT NULL DEFAULT 'success',
  message    TEXT DEFAULT '',
  ran_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
