-- Migration 008: Audit trail columns for smart polling + housekeeping housekeeping
-- Adds updated_at to tables that didn't have one, so the /api/admin/ping endpoint
-- can detect changes in those tables.

ALTER TABLE invoices      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE payments      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Bump updated_at automatically when these rows are touched
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_touch_updated_at ON invoices;
CREATE TRIGGER invoices_touch_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS payments_touch_updated_at ON payments;
CREATE TRIGGER payments_touch_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS blocked_dates_touch_updated_at ON blocked_dates;
CREATE TRIGGER blocked_dates_touch_updated_at
  BEFORE UPDATE ON blocked_dates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
