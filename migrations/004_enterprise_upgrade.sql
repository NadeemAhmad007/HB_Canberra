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
  ('booking_confirmed', 'Booking Confirmed — Houseboat Canberra', 'Dear {{guest_name}},\n\nThank you for choosing **Houseboat Canberra**.\n\nWe are delighted to confirm your reservation and look forward to welcoming you aboard for a memorable stay.\n\n---\n\n**Booking Details**\n\n**Booking Reference:** {{booking_ref}}\n**Check-in:** {{check_in}}\n**Check-out:** {{check_out}}\n**Accommodation:** {{room_name}}\n**Total Amount:** ₹{{amount}}\n\n---\n\nIf you require any assistance before your arrival, or if you would like to arrange any special requests, please feel free to contact us.\n\nA few days before your check-in, we will send you detailed arrival instructions and any additional information you may need for a smooth and comfortable experience.\n\nThank you once again for choosing Houseboat Canberra. We look forward to hosting you and making your stay truly exceptional.\n\nWarm regards,\n\n**Houseboat Canberra**\nLuxury Afloat\n\nEmail: {{property_email}}\nPhone: {{property_phone}}\nWebsite: {{property_website}}'),
  ('checkin_reminder', 'You check in tomorrow — Houseboat Canberra', 'Dear {{guest_name}},\n\nA warm hello from **Houseboat Canberra**!\n\nWe are excited to welcome you tomorrow for your stay.\n\n---\n\n**Booking Reference:** {{booking_ref}}\n**Check-in:** {{check_in}}\n**Check-out:** {{check_out}}\n**Accommodation:** {{room_name}}\n\n---\n\nHere are a few things to help you prepare:\n\n• Our check-in time is 14:00, and check-out is 11:00.\n• Complimentary welcome kahwa awaits you in your suite.\n• Free shikara ride at sunset — just let us know when.\n\nIf you have any questions or special requests, please don''t hesitate to reach out.\n\nSee you soon!\n\nWarm regards,\n\n**Houseboat Canberra**\nLuxury Afloat\n\nEmail: {{property_email}}\nPhone: {{property_phone}}'),
  ('post_stay', 'Thank you for staying with us', 'Dear {{guest_name}},\n\nThank you for choosing **Houseboat Canberra** for your stay on Dal Lake.\n\nWe hope you had a wonderful and memorable experience. Your feedback helps us improve, and we would love to hear about your stay.\n\n---\n\nIf you enjoyed your time with us, we would be grateful if you could leave a review. We look forward to welcoming you back on your next visit to Srinagar.\n\nUntil we meet again,\n\nWarm regards,\n\n**Houseboat Canberra**\nLuxury Afloat\n\nEmail: {{property_email}}\nPhone: {{property_phone}}\nWebsite: {{property_website}}')
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
