-- Migration: Create services table
-- Description: Stores service directory metadata (cached from on-chain registry)

CREATE TABLE IF NOT EXISTS services (
  service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal VARCHAR(42) UNIQUE NOT NULL,
  bns_name VARCHAR(255),
  endpoint_url TEXT NOT NULL,
  policy_hash VARCHAR(64) NOT NULL,
  policy_url TEXT,
  category VARCHAR(50),
  tags TEXT[],
  supported_tokens JSONB NOT NULL,
  pricing JSONB,

  -- On-chain data
  registered_at BIGINT NOT NULL,
  stake_amount BIGINT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_services_principal ON services(principal);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(active);
CREATE INDEX idx_services_bns_name ON services(bns_name);

-- Unique constraint on principal (already enforced but explicit)
-- Already enforced by UNIQUE constraint

-- Comments
COMMENT ON TABLE services IS 'Service directory listings (cached from on-chain registry)';
COMMENT ON COLUMN services.service_id IS 'UUID identifier for this service';
COMMENT ON COLUMN services.principal IS 'Stacks principal (unique identity)';
COMMENT ON COLUMN services.bns_name IS 'Optional BNS name (e.g., yield-api.btc)';
COMMENT ON COLUMN services.endpoint_url IS 'Base URL for service API';
COMMENT ON COLUMN services.policy_hash IS 'SHA-256 hash of service policy JSON';
COMMENT ON COLUMN services.policy_url IS 'URL to fetch policy JSON';
COMMENT ON COLUMN services.category IS 'Service category (yield, staking, oracle, etc.)';
COMMENT ON COLUMN services.tags IS 'Array of tags for filtering';
COMMENT ON COLUMN services.supported_tokens IS 'Array of supported token contracts';
COMMENT ON COLUMN services.pricing IS 'Pricing metadata per endpoint';
COMMENT ON COLUMN services.registered_at IS 'Block height when registered on-chain';
COMMENT ON COLUMN services.stake_amount IS 'STX stake locked (in microSTX)';
COMMENT ON COLUMN services.active IS 'Whether service is currently active';
