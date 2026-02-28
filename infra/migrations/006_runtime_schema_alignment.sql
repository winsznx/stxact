-- Migration: Runtime schema alignment for proxy/webapp workflow
-- Description: Align legacy migration-built schemas with current production code paths

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Services table alignment
-- ---------------------------------------------------------------------------
ALTER TABLE services ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS pricing JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'services'
      AND column_name = 'registered_at'
      AND data_type = 'bigint'
  ) THEN
    ALTER TABLE services ADD COLUMN IF NOT EXISTS registered_at_tmp TIMESTAMP WITH TIME ZONE;
    UPDATE services
    SET registered_at_tmp =
      CASE
        WHEN registered_at >= 1000000000 THEN to_timestamp(registered_at)
        ELSE NOW()
      END
    WHERE registered_at_tmp IS NULL;

    ALTER TABLE services DROP COLUMN registered_at;
    ALTER TABLE services RENAME COLUMN registered_at_tmp TO registered_at;
  END IF;
END $$;

ALTER TABLE services ALTER COLUMN registered_at SET DEFAULT NOW();
UPDATE services SET registered_at = NOW() WHERE registered_at IS NULL;
ALTER TABLE services ALTER COLUMN registered_at SET NOT NULL;

UPDATE services SET supported_tokens = '[]'::jsonb WHERE supported_tokens IS NULL;
ALTER TABLE services ALTER COLUMN supported_tokens SET DEFAULT '[]'::jsonb;
ALTER TABLE services ALTER COLUMN supported_tokens SET NOT NULL;

UPDATE services SET active = true WHERE active IS NULL;
ALTER TABLE services ALTER COLUMN active SET DEFAULT true;
ALTER TABLE services ALTER COLUMN active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_registered_at ON services(registered_at DESC);

-- ---------------------------------------------------------------------------
-- Receipts table alignment
-- ---------------------------------------------------------------------------
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_request_payment ON receipts(request_hash, payment_txid);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_timestamp ON receipts(timestamp DESC);

-- ---------------------------------------------------------------------------
-- Disputes table alignment
-- ---------------------------------------------------------------------------
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS acknowledged_at BIGINT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

UPDATE disputes
SET updated_at = COALESCE(updated_at, db_updated_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE disputes ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE disputes ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE disputes DROP CONSTRAINT IF EXISTS chk_dispute_status;
  ALTER TABLE disputes DROP CONSTRAINT IF EXISTS valid_status;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'disputes_status_check'
      AND conrelid = 'disputes'::regclass
  ) THEN
    ALTER TABLE disputes
      ADD CONSTRAINT disputes_status_check
      CHECK (status IN ('open', 'acknowledged', 'resolved', 'refunded', 'rejected', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- ---------------------------------------------------------------------------
-- Replay protection and reputation audit tables
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_used_payments_request_hash ON used_payments(request_hash);

CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_principal VARCHAR(42) NOT NULL,
  receipt_id UUID NOT NULL,
  payment_amount TEXT NOT NULL,
  event_type TEXT NOT NULL,
  txid TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_seller ON reputation_events(seller_principal);
CREATE INDEX IF NOT EXISTS idx_reputation_events_receipt ON reputation_events(receipt_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_created_at ON reputation_events(created_at DESC);

-- ---------------------------------------------------------------------------
-- Refund authorization alignment
-- ---------------------------------------------------------------------------
ALTER TABLE refund_authorizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_refund_authorizations_receipt ON refund_authorizations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_refund_authorizations_created_at ON refund_authorizations(created_at DESC);

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger function and triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'services_updated_at') THEN
    CREATE TRIGGER services_updated_at
      BEFORE UPDATE ON services
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'receipts_updated_at') THEN
    CREATE TRIGGER receipts_updated_at
      BEFORE UPDATE ON receipts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'disputes_updated_at') THEN
    CREATE TRIGGER disputes_updated_at
      BEFORE UPDATE ON disputes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refund_authorizations_updated_at') THEN
    CREATE TRIGGER refund_authorizations_updated_at
      BEFORE UPDATE ON refund_authorizations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
