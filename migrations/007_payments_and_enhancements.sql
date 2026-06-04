-- Payments, partial-payment tracking, guest enhancements

CREATE TABLE IF NOT EXISTS payments (
  id           SERIAL PRIMARY KEY,
  booking_ref  TEXT NOT NULL REFERENCES bookings(booking_ref) ON DELETE CASCADE,
  amount       INT  NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT 'INR',
  method       TEXT NOT NULL DEFAULT 'bank'
    CHECK (method IN ('bank','upi','cash','card','razorpay','stripe','other')),
  reference    TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  recorded_by  TEXT NOT NULL DEFAULT 'admin',
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments (booking_ref);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid INT NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount INT NOT NULL DEFAULT 0;

-- Guests already exist from migration 003, ensure email is unique for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guests_email_unique') THEN
    ALTER TABLE guests ADD CONSTRAINT guests_email_unique UNIQUE (email);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
