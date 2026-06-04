-- Payment gateway support
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_data JSONB DEFAULT '{}';
