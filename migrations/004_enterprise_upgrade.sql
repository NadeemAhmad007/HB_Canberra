-- Houseboat Canberra — Enterprise Upgrade
-- Room content, notes, role-based auth, housekeeping

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '[]';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS tour_url TEXT NOT NULL DEFAULT '';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tc_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS id_proof TEXT NOT NULL DEFAULT '';

-- Users for role-based auth
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reception' CHECK (role IN ('owner','reception','housekeeping','accountant')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  trigger_event TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO email_templates (trigger_event, subject, body) VALUES
  ('booking_confirmed', 'Your stay at Houseboat Canberra is confirmed — {{booking_ref}}', 'Dear {{guest_name}},\n\nThank you for choosing **Houseboat Canberra**.\n\nWe are delighted to confirm your reservation and look forward to welcoming you aboard for a memorable stay on the tranquil waters of Dal Lake.\n\n---\n\n**Reservation Summary**\n\n**Reference:** {{booking_ref}}\n**Check-in:** {{check_in}}\n**Check-out:** {{check_out}}\n**Accommodation:** {{room_name}}\n**Total Amount:** ₹{{amount}}\n\n---\n\nIf you have any special requests or require assistance with transfers, sightseeing, or dining reservations, please feel free to reply to this email. Our team is always happy to help.\n\nA few days before your check-in, we will send you detailed arrival instructions and everything you need for a seamless experience.\n\nThank you once again for choosing Houseboat Canberra. We look forward to hosting you.\n\nWarm regards,\n\n**Houseboat Canberra**\nLuxury Afloat — Dal Lake, Srinagar'),
  ('checkin_reminder', 'Welcome to Houseboat Canberra — your stay begins tomorrow', 'Dear {{guest_name}},\n\nA warm hello from **Houseboat Canberra**!\n\nWe are excited to welcome you tomorrow for your stay on the beautiful Dal Lake. Here is a quick reminder of your reservation:\n\n---\n\n**Reservation Details**\n\n**Reference:** {{booking_ref}}\n**Check-in:** {{check_in}} at {{checkin_time}}\n**Check-out:** {{check_out}} at {{checkout_time}}\n**Accommodation:** {{room_name}}\n\n---\n\n**Important Information**\n• **Check-in:** {{checkin_time}} | **Check-out:** {{checkout_time}}\n• **Address:** {{property_address}}\n• Complimentary welcome kahwa upon arrival\n• Free sunset shikara ride — just let us know when you arrive\n\nIf you need directions, assistance, or have any special requests, please don''t hesitate to contact us.\n\nWe look forward to welcoming you aboard and making your stay truly exceptional.\n\nWarm regards,\n\n**Houseboat Canberra**\nLuxury Afloat — Dal Lake, Srinagar'),
  ('post_stay', 'Thank you for staying at Houseboat Canberra', 'Dear {{guest_name}},\n\nThank you for choosing **Houseboat Canberra** for your stay on Dal Lake.\n\nWe hope you had a memorable experience and that the serenity of the lake, the warmth of our hospitality, and the beauty of Kashmir will stay with you long after your departure.\n\nYour feedback means the world to us. If you have a moment, we would love to hear about your stay — what you enjoyed and how we can make the experience even better for future guests.\n\n**Reference:** {{booking_ref}}\n\nTo share your thoughts, simply reply to this email. We read every message personally.\n\nThank you once again for being our guest. We would be honoured to welcome you back on your next visit to Srinagar.\n\nUntil we meet again,\n\nWarm regards,\n\n**Houseboat Canberra**\nLuxury Afloat — Dal Lake, Srinagar')
ON CONFLICT (trigger_event) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body, updated_at = now();

-- Housekeeping tasks
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES rooms(id),
  task_type TEXT NOT NULL DEFAULT 'clean' CHECK (task_type IN ('clean','inspect','maintenance','deep_clean')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  assigned_to TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure booking_ref is unique for FK reference
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_booking_ref_unique') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_booking_ref_unique UNIQUE (booking_ref);
  END IF;
END $$;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  booking_ref TEXT NOT NULL REFERENCES bookings(booking_ref),
  invoice_no TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INT NOT NULL DEFAULT 0,
  tax INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add cancellation policy to settings
INSERT INTO settings (key, value) VALUES
  ('cancellation_policy', 'Free cancellation up to 7 days before check-in. 50% charge within 7 days. No refund after check-in.'),
  ('cancellation_days', '7')
ON CONFLICT (key) DO NOTHING;
