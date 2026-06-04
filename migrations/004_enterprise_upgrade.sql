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
  ('booking_confirmed', 'Booking Confirmed — Houseboat Canberra', 'Dear {{guest_name}},\n\nYour booking {{booking_ref}} is confirmed!\n\nCheck-in: {{check_in}}\nCheck-out: {{check_out}}\nRoom: {{room_name}}\nAmount: ₹{{amount}}\n\nWe look forward to welcoming you.\n\n— Houseboat Canberra'),
  ('checkin_reminder', 'You check in tomorrow — Houseboat Canberra', 'Dear {{guest_name}},\n\nThis is a reminder that you check in tomorrow at Houseboat Canberra.\n\nBooking: {{booking_ref}}\nCheck-in: {{check_in}}\n\nSee you soon!\n\n— Houseboat Canberra'),
  ('post_stay', 'Thank you for staying with us', 'Dear {{guest_name}},\n\nThank you for choosing Houseboat Canberra. We hope you had a wonderful stay!\n\nWe would love to hear your feedback.\n\n— Houseboat Canberra')
ON CONFLICT (trigger_event) DO NOTHING;

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
