-- stxact Database Schema
-- Production-ready schema for trust & settlement fabric

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Services Table
CREATE TABLE IF NOT EXISTS services (
    service_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    principal TEXT NOT NULL UNIQUE,
    bns_name TEXT,
    endpoint_url TEXT NOT NULL,
    policy_hash TEXT NOT NULL,
    policy_url TEXT,
    category TEXT NOT NULL,
    tags TEXT[],
    supported_tokens JSONB NOT NULL DEFAULT '[]',
    pricing JSONB,
    stake_amount BIGINT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_category CHECK (category IN ('data-api', 'ai-compute', 'storage', 'analytics', 'oracle', 'yield', 'other'))
);

CREATE INDEX idx_services_principal ON services(principal);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(active);
CREATE INDEX idx_services_registered_at ON services(registered_at DESC);

-- Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    request_hash TEXT NOT NULL,
    payment_txid TEXT NOT NULL,
    seller_principal TEXT NOT NULL,
    seller_bns_name TEXT,
    buyer_principal TEXT,
    delivery_commitment TEXT,
    timestamp BIGINT NOT NULL,
    block_height BIGINT NOT NULL,
    block_hash TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    revision INTEGER NOT NULL DEFAULT 0,
    service_policy_hash TEXT,
    metadata JSONB,
    signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT receipts_timestamp_positive CHECK (timestamp > 0),
    CONSTRAINT receipts_block_height_positive CHECK (block_height > 0),
    CONSTRAINT receipts_key_version_nonnegative CHECK (key_version >= 0),
    CONSTRAINT receipts_revision_nonnegative CHECK (revision >= 0),

    FOREIGN KEY (seller_principal) REFERENCES services(principal) ON DELETE CASCADE
);

CREATE INDEX idx_receipts_seller ON receipts(seller_principal);
CREATE INDEX idx_receipts_buyer ON receipts(buyer_principal);
CREATE INDEX idx_receipts_payment_txid ON receipts(payment_txid);
CREATE INDEX idx_receipts_timestamp ON receipts(timestamp DESC);
CREATE INDEX idx_receipts_block_height ON receipts(block_height DESC);
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);
CREATE UNIQUE INDEX idx_receipts_request_payment ON receipts(request_hash, payment_txid);

-- Replay Protection Table (permanent payment binding, no TTL)
CREATE TABLE IF NOT EXISTS used_payments (
    payment_txid TEXT PRIMARY KEY,
    request_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_used_payments_created_at ON used_payments(created_at DESC);
CREATE INDEX idx_used_payments_request_hash ON used_payments(request_hash);

-- Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id TEXT NOT NULL,
    buyer_principal TEXT NOT NULL,
    seller_principal TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence JSONB,
    status TEXT NOT NULL DEFAULT 'open',
    created_at BIGINT NOT NULL,
    acknowledged_at BIGINT,
    resolved_at BIGINT,
    refund_amount TEXT,
    refund_txid TEXT,
    refund_block_height BIGINT,
    resolution_notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE CASCADE,
    CONSTRAINT valid_status CHECK (status IN ('open', 'acknowledged', 'resolved', 'refunded', 'rejected'))
);

CREATE INDEX idx_disputes_receipt ON disputes(receipt_id);
CREATE INDEX idx_disputes_buyer ON disputes(buyer_principal);
CREATE INDEX idx_disputes_seller ON disputes(seller_principal);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

-- Reputation Event Audit Table
CREATE TABLE IF NOT EXISTS reputation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_principal TEXT NOT NULL,
    receipt_id TEXT NOT NULL,
    payment_amount TEXT NOT NULL,
    event_type TEXT NOT NULL,
    txid TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    FOREIGN KEY (seller_principal) REFERENCES services(principal) ON DELETE CASCADE,
    FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE CASCADE
);

CREATE INDEX idx_reputation_events_seller ON reputation_events(seller_principal);
CREATE INDEX idx_reputation_events_receipt ON reputation_events(receipt_id);
CREATE INDEX idx_reputation_events_created_at ON reputation_events(created_at DESC);

-- Refund Authorization Audit Table
CREATE TABLE IF NOT EXISTS refund_authorizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL UNIQUE,
    receipt_id TEXT NOT NULL,
    refund_amount TEXT NOT NULL,
    buyer_principal TEXT NOT NULL,
    seller_principal TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    signature TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    FOREIGN KEY (dispute_id) REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE CASCADE
);

CREATE INDEX idx_refund_authorizations_receipt ON refund_authorizations(receipt_id);
CREATE INDEX idx_refund_authorizations_seller ON refund_authorizations(seller_principal);
CREATE INDEX idx_refund_authorizations_created_at ON refund_authorizations(created_at DESC);

-- Reputation Cache Table (derived from on-chain data)
CREATE TABLE IF NOT EXISTS reputation_cache (
    principal TEXT PRIMARY KEY,
    score INTEGER NOT NULL DEFAULT 0,
    total_volume TEXT NOT NULL DEFAULT '0',
    total_receipts INTEGER NOT NULL DEFAULT 0,
    total_disputes INTEGER NOT NULL DEFAULT 0,
    total_refunds INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    FOREIGN KEY (principal) REFERENCES services(principal) ON DELETE CASCADE
);

CREATE INDEX idx_reputation_score ON reputation_cache(score DESC);
CREATE INDEX idx_reputation_last_updated ON reputation_cache(last_updated);

-- Contract Deployments Table (tracks deployed contract addresses)
CREATE TABLE IF NOT EXISTS contract_deployments (
    contract_name TEXT PRIMARY KEY,
    contract_address TEXT NOT NULL,
    deployer_address TEXT NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    network TEXT NOT NULL DEFAULT 'devnet',

    CONSTRAINT valid_network CHECK (network IN ('devnet', 'testnet', 'mainnet'))
);

-- Audit Log Table (immutable event log)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    principal TEXT,
    receipt_id TEXT,
    dispute_id UUID,
    payload JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_event_type CHECK (event_type IN (
        'service_registered',
        'service_updated',
        'receipt_created',
        'receipt_updated',
        'dispute_created',
        'dispute_resolved',
        'refund_executed',
        'reputation_updated'
    ))
);

CREATE INDEX idx_audit_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_principal ON audit_log(principal);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamps
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER receipts_updated_at
    BEFORE UPDATE ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER refund_authorizations_updated_at
    BEFORE UPDATE ON refund_authorizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- View for service reputation with stats
CREATE OR REPLACE VIEW service_stats AS
SELECT
    s.service_id,
    s.principal,
    s.bns_name,
    s.category,
    s.stake_amount,
    s.active,
    s.registered_at,
    COALESCE(rc.score, 0) as reputation_score,
    COALESCE(rc.total_volume, '0') as total_volume,
    COALESCE(rc.total_receipts, 0) as total_receipts,
    COALESCE(rc.total_disputes, 0) as total_disputes,
    COALESCE(rc.success_rate, 1.0) as success_rate,
    COUNT(DISTINCT r.receipt_id) as receipts_count,
    COUNT(DISTINCT d.dispute_id) as disputes_count
FROM services s
LEFT JOIN reputation_cache rc ON s.principal = rc.principal
LEFT JOIN receipts r ON s.principal = r.seller_principal
LEFT JOIN disputes d ON s.principal = d.seller_principal
GROUP BY s.service_id, s.principal, s.bns_name, s.category, s.stake_amount,
         s.active, s.registered_at, rc.score, rc.total_volume, rc.total_receipts,
         rc.total_disputes, rc.success_rate;

-- Grant permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stxact_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stxact_user;
