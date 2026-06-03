-- Guests profile table
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  nationality TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  vip BOOLEAN NOT NULL DEFAULT false,
  total_stays INTEGER NOT NULL DEFAULT 0,
  total_spend INTEGER NOT NULL DEFAULT 0,
  last_stay DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hotel settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('hotel_name', 'Houseboat Canberra'),
  ('hotel_address', 'Dal Lake, Srinagar'),
  ('hotel_email', 'Houseboat.canberra@gmail.com'),
  ('hotel_phone', '+49 176 84005474'),
  ('tax_rate', '12'),
  ('currency', 'INR'),
  ('checkin_time', '14:00'),
  ('checkout_time', '11:00'),
  ('default_nights', '1'),
  ('timezone', 'Asia/Kolkata')
ON CONFLICT (key) DO NOTHING;

-- Room images
CREATE TABLE IF NOT EXISTS room_images (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url TEXT NOT NULL DEFAULT '',
  alt TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Add room active/status to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';
