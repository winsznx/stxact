-- Test data for stxact

-- Insert test services
INSERT INTO services (
    principal,
    bns_name,
    endpoint_url,
    policy_hash,
    category,
    supported_tokens,
    stake_amount,
    active
) VALUES
    (
        'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        'oracle.btc',
        'https://oracle.btc.stx/api',
        'abc123def456789',
        'oracle',
        '[{"symbol":"STX","contract":"SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.token-stx"}]',
        100000000,
        true
    ),
    (
        'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
        'ai-compute.btc',
        'https://ai.compute.stx/api',
        'def456ghi789',
        'ai-compute',
        '[{"symbol":"STX"},{"symbol":"sBTC"}]',
        250000000,
        true
    ),
    (
        'SP1HDZY6H3FH3KFK8XNM5K5GKGQJVGZ1R9BQB87TG',
        'data-api.btc',
        'https://data.api.stx/api',
        'ghi789jkl012',
        'data-api',
        '[{"symbol":"STX"},{"symbol":"USDCx"}]',
        150000000,
        true
    );

-- Insert reputation cache for services
INSERT INTO reputation_cache (
    principal,
    score,
    total_volume,
    total_receipts,
    total_disputes,
    success_rate
) VALUES
    ('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 85, '5000000', 245, 2, 0.992),
    ('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE', 92, '12500000', 580, 1, 0.998),
    ('SP1HDZY6H3FH3KFK8XNM5K5GKGQJVGZ1R9BQB87TG', 78, '3200000', 156, 5, 0.968);

-- Insert test receipts
INSERT INTO receipts (
    receipt_id,
    request_hash,
    payment_txid,
    seller_principal,
    seller_bns_name,
    buyer_principal,
    delivery_commitment,
    timestamp,
    block_height,
    block_hash,
    key_version,
    revision,
    signature
) VALUES
    (
        'rx_abc123def456',
        'req_hash_001',
        '0x7a8b9c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
        'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        'oracle.btc',
        'SP456ABC789DEF012GHI345JKL678MNO901PQR234ST',
        'delivery_hash_001',
        1708000000,
        123456,
        'block_hash_123456',
        1,
        1,
        'sig_abc123def456'
    ),
    (
        'rx_def789ghi012',
        'req_hash_002',
        '0x8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3',
        'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
        'ai-compute.btc',
        'SP789DEF012GHI345JKL678MNO901PQR234STU567VW',
        'delivery_hash_002',
        1708100000,
        123500,
        'block_hash_123500',
        1,
        1,
        'sig_def789ghi012'
    );

-- Insert test disputes
INSERT INTO disputes (
    receipt_id,
    buyer_principal,
    seller_principal,
    reason,
    status,
    created_at
) VALUES
    (
        'rx_abc123def456',
        'SP456ABC789DEF012GHI345JKL678MNO901PQR234ST',
        'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        'Delivery did not match commitment hash',
        'resolved',
        1708010000
    );
