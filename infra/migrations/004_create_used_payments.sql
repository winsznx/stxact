-- Migration: Create used_payments table
-- Description: Permanent tracking of used payment transactions (Option B - institutional-grade replay protection)
-- Purpose: Prevents payment_txid from being reused for different requests

CREATE TABLE IF NOT EXISTS used_payments (
  payment_txid TEXT PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on payment_txid (redundant with PK but explicit for queries)
-- Already enforced by PRIMARY KEY

-- Index on created_at for potential cleanup queries (though retention is permanent)
CREATE INDEX idx_used_payments_created_at ON used_payments(created_at);

-- Comments
COMMENT ON TABLE used_payments IS 'Permanent tracking of used payment transactions to prevent replay attacks';
COMMENT ON COLUMN used_payments.payment_txid IS 'Blockchain transaction ID (unique constraint prevents reuse)';
COMMENT ON COLUMN used_payments.request_hash IS 'SHA-256 hash of the request this payment was used for';
COMMENT ON COLUMN used_payments.created_at IS 'Timestamp when payment was first used';

-- Note: This table implements Option B from PRD Section 8 (lines 1207-1224)
-- Option B: Permanent Tracking - Never expire payment transaction IDs
-- Recommended for institutional services and high-value transactions
-- Prevents any theoretical replay at cost of unbounded storage growth
