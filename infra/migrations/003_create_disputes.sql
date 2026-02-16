-- Migration: Create disputes table
-- Description: Stores dispute records for failed or incorrect deliveries

CREATE TABLE IF NOT EXISTS disputes (
  dispute_id UUID PRIMARY KEY,
  receipt_id UUID NOT NULL,
  buyer_principal VARCHAR(42) NOT NULL,
  seller_principal VARCHAR(42) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at BIGINT NOT NULL,
  resolved_at BIGINT,
  refund_amount BIGINT,
  refund_txid TEXT,
  evidence JSONB,

  -- Timestamps
  db_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  db_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key constraints
  CONSTRAINT fk_receipt FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE CASCADE,

  -- Check constraint for status enum
  CONSTRAINT chk_dispute_status CHECK (status IN ('open', 'acknowledged', 'resolved', 'rejected', 'expired'))
);

-- Indexes
CREATE INDEX idx_disputes_dispute_id ON disputes(dispute_id);
CREATE INDEX idx_disputes_receipt_id ON disputes(receipt_id);
CREATE INDEX idx_disputes_seller_principal ON disputes(seller_principal);
CREATE INDEX idx_disputes_buyer_principal ON disputes(buyer_principal);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_created_at ON disputes(created_at);

-- Unique constraint: one dispute per receipt
CREATE UNIQUE INDEX idx_disputes_unique_receipt ON disputes(receipt_id);

-- Comments
COMMENT ON TABLE disputes IS 'Dispute records for failed or incorrect deliveries';
COMMENT ON COLUMN disputes.dispute_id IS 'UUID unique identifier for dispute';
COMMENT ON COLUMN disputes.receipt_id IS 'Reference to original receipt';
COMMENT ON COLUMN disputes.buyer_principal IS 'Buyer who filed the dispute';
COMMENT ON COLUMN disputes.seller_principal IS 'Seller being disputed';
COMMENT ON COLUMN disputes.reason IS 'Dispute reason (delivery_hash_mismatch, no_response, etc.)';
COMMENT ON COLUMN disputes.status IS 'Current status (open, acknowledged, resolved, rejected, expired)';
COMMENT ON COLUMN disputes.created_at IS 'Block height when dispute was created';
COMMENT ON COLUMN disputes.resolved_at IS 'Block height when dispute was resolved';
COMMENT ON COLUMN disputes.refund_amount IS 'Refund amount in smallest token unit (sats)';
COMMENT ON COLUMN disputes.refund_txid IS 'Blockchain transaction ID for refund';
COMMENT ON COLUMN disputes.evidence IS 'Evidence provided by buyer (expected_hash, received_hash, notes)';
