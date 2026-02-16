-- Migration: Create receipts table
-- Description: Stores all receipt data with 13 core fields from PRD Section 8

CREATE TABLE IF NOT EXISTS receipts (
  -- Core fields (13 required fields from Receipt interface)
  receipt_id UUID PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL,
  payment_txid TEXT NOT NULL,
  seller_principal VARCHAR(42) NOT NULL,
  seller_bns_name VARCHAR(255),
  buyer_principal VARCHAR(42),
  delivery_commitment VARCHAR(64),
  timestamp BIGINT NOT NULL,
  block_height BIGINT NOT NULL,
  block_hash VARCHAR(66) NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 0,
  service_policy_hash VARCHAR(64),

  -- Additional fields
  metadata JSONB,
  signature TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_receipts_seller_principal ON receipts(seller_principal);
CREATE INDEX idx_receipts_payment_txid ON receipts(payment_txid);
CREATE INDEX idx_receipts_buyer_principal ON receipts(buyer_principal);
CREATE INDEX idx_receipts_seller_timestamp ON receipts(seller_principal, timestamp);
CREATE INDEX idx_receipts_block_height ON receipts(block_height);

-- Unique constraint on receipt_id (redundant with PK but explicit)
-- Already enforced by PRIMARY KEY

-- Comments for documentation
COMMENT ON TABLE receipts IS 'Cryptographically signed receipts for x402 transactions';
COMMENT ON COLUMN receipts.receipt_id IS 'UUIDv4 unique identifier';
COMMENT ON COLUMN receipts.request_hash IS 'SHA-256 hash of request (method+path+body+timestamp bucket)';
COMMENT ON COLUMN receipts.payment_txid IS 'Blockchain transaction ID for payment';
COMMENT ON COLUMN receipts.seller_principal IS 'Stacks principal (SP... or SM...)';
COMMENT ON COLUMN receipts.seller_bns_name IS 'Optional BNS name (e.g., yield-api.btc)';
COMMENT ON COLUMN receipts.buyer_principal IS 'Optional buyer identity';
COMMENT ON COLUMN receipts.delivery_commitment IS 'SHA-256 hash of deliverable (null for provisional receipts)';
COMMENT ON COLUMN receipts.timestamp IS 'Unix timestamp in seconds';
COMMENT ON COLUMN receipts.block_height IS 'Block height at payment confirmation';
COMMENT ON COLUMN receipts.block_hash IS 'Block hash at payment confirmation';
COMMENT ON COLUMN receipts.key_version IS 'Signing key version (for rotation support)';
COMMENT ON COLUMN receipts.revision IS 'Receipt revision number (0=initial, 1+=updated)';
COMMENT ON COLUMN receipts.service_policy_hash IS 'SHA-256 hash of service policy JSON';
COMMENT ON COLUMN receipts.metadata IS 'Non-signed additional fields (job_id, status, etc.)';
COMMENT ON COLUMN receipts.signature IS 'ECDSA signature over canonical message, base64-encoded';
