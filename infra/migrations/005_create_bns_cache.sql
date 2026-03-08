-- Migration: Create bns_cache table
-- Description: Cache BNS name lookups to reduce on-chain queries
-- TTL: 1 hour (3600 seconds) as specified in PRD Section 9

CREATE TABLE IF NOT EXISTS bns_cache (
  bns_name VARCHAR(255) PRIMARY KEY,
  owner_principal VARCHAR(42) NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE OR REPLACE FUNCTION set_bns_cache_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cached_at = COALESCE(NEW.cached_at, NOW());
  NEW.ttl_seconds = COALESCE(NEW.ttl_seconds, 3600);
  NEW.expires_at = NEW.cached_at + (NEW.ttl_seconds * INTERVAL '1 second');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'bns_cache_set_expiry'
  ) THEN
    CREATE TRIGGER bns_cache_set_expiry
      BEFORE INSERT OR UPDATE ON bns_cache
      FOR EACH ROW
      EXECUTE FUNCTION set_bns_cache_expiry();
  END IF;
END $$;

UPDATE bns_cache
SET cached_at = COALESCE(cached_at, NOW()),
    ttl_seconds = COALESCE(ttl_seconds, 3600),
    expires_at = COALESCE(
      expires_at,
      COALESCE(cached_at, NOW()) + (COALESCE(ttl_seconds, 3600) * INTERVAL '1 second')
    )
WHERE expires_at IS NULL OR cached_at IS NULL OR ttl_seconds IS NULL;

ALTER TABLE bns_cache ALTER COLUMN cached_at SET DEFAULT NOW();
ALTER TABLE bns_cache ALTER COLUMN cached_at SET NOT NULL;
ALTER TABLE bns_cache ALTER COLUMN ttl_seconds SET DEFAULT 3600;
ALTER TABLE bns_cache ALTER COLUMN ttl_seconds SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bns_cache_owner_principal ON bns_cache(owner_principal);
CREATE INDEX IF NOT EXISTS idx_bns_cache_expires_at ON bns_cache(expires_at);

-- Comments
COMMENT ON TABLE bns_cache IS 'Cache for BNS name lookups (1-hour TTL to minimize impersonation window)';
COMMENT ON COLUMN bns_cache.bns_name IS 'BNS name (e.g., yield-api.btc) - unique identifier';
COMMENT ON COLUMN bns_cache.owner_principal IS 'Stacks principal that owns this BNS name';
COMMENT ON COLUMN bns_cache.cached_at IS 'Timestamp when this entry was cached';
COMMENT ON COLUMN bns_cache.ttl_seconds IS 'Time-to-live in seconds (default 3600 = 1 hour)';
COMMENT ON COLUMN bns_cache.expires_at IS 'Computed expiration timestamp (cached_at + ttl_seconds)';

-- Note: Cache invalidation occurs on:
-- 1. TTL expiration (expires_at < NOW())
-- 2. BNS transfer event (webhook from Stacks API) - manual invalidation
-- Queries should check: WHERE bns_name = $1 AND expires_at > NOW()
