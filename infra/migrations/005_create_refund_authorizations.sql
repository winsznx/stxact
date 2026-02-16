-- Create refund_authorizations table
-- Stores seller-signed refund authorizations for audit compliance
-- PRD Reference: Section 11 - Dispute Resolution (lines 1596-1649)

CREATE TABLE IF NOT EXISTS refund_authorizations (
  id SERIAL PRIMARY KEY,
  dispute_id UUID NOT NULL,
  receipt_id UUID NOT NULL,
  refund_amount BIGINT NOT NULL,
  buyer_principal VARCHAR(42) NOT NULL,
  seller_principal VARCHAR(42) NOT NULL,
  timestamp BIGINT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  executed BOOLEAN DEFAULT FALSE,
  execution_txid TEXT,
  execution_block_height BIGINT,
  CONSTRAINT fk_dispute
    FOREIGN KEY(dispute_id)
    REFERENCES disputes(dispute_id)
    ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX idx_refund_authorizations_dispute_id ON refund_authorizations(dispute_id);
CREATE INDEX idx_refund_authorizations_seller ON refund_authorizations(seller_principal);
CREATE INDEX idx_refund_authorizations_created_at ON refund_authorizations(created_at);

-- Prevent duplicate authorizations for same dispute
CREATE UNIQUE INDEX idx_refund_authorizations_unique_dispute ON refund_authorizations(dispute_id);

COMMENT ON TABLE refund_authorizations IS 'Seller-signed refund authorizations for audit trail';
COMMENT ON COLUMN refund_authorizations.signature IS 'ECDSA signature over canonical refund message';
COMMENT ON COLUMN refund_authorizations.verified IS 'Whether signature was verified off-chain';
COMMENT ON COLUMN refund_authorizations.executed IS 'Whether refund was executed on-chain';
COMMENT ON COLUMN refund_authorizations.execution_txid IS 'Blockchain transaction ID of execute-refund call';
