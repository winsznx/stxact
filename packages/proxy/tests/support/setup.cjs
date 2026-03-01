const crypto = require('crypto');

const TEST_PRIVATE_KEY =
  'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
const TEST_SERVICE_PRINCIPAL = 'STAW66WC3G8WA5F28JVNG1NTRJ6H76E7EMHDBMBN';
const TEST_BUYER_PRINCIPAL = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

function createDbState() {
  return {
    usedPayments: new Map(),
    receipts: new Map(),
    services: new Map(),
    disputes: new Map(),
    refundAuthorizations: new Map(),
    reputationEvents: [],
    nextServiceId: 1,
    nextRefundAuthorizationId: 1,
  };
}

const mockState = {
  db: createDbState(),
  redis: new Map(),
  txCounter: 0,
};

function resetState() {
  mockState.db = createDbState();
  mockState.redis = new Map();
  mockState.txCounter = 0;
}

function normalizeQuery(query) {
  return query.replace(/\s+/g, ' ').trim().toLowerCase();
}

function cloneRow(row) {
  return {
    ...row,
    supported_tokens: Array.isArray(row.supported_tokens)
      ? [...row.supported_tokens]
      : row.supported_tokens,
    tags: Array.isArray(row.tags) ? [...row.tags] : row.tags,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? { ...row.metadata }
        : row.metadata,
  };
}

function patternMatches(value, pattern) {
  if (value === undefined || value === null) {
    return false;
  }

  if (!pattern.includes('%')) {
    return String(value) === pattern;
  }

  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(String(value));
}

function parseInsertColumns(query) {
  const match = query.match(/insert into [^(]+\(([^)]+)\)/i);
  return match
    ? match[1].split(',').map((column) => column.trim())
    : [];
}

function buildRow(columns, values) {
  return columns.reduce((row, column, index) => {
    row[column] = values[index];
    return row;
  }, {});
}

function getReceiptStats(principal) {
  const receipts = Array.from(mockState.db.receipts.values()).filter(
    (receipt) => receipt.seller_principal === principal
  );
  const totalReceipts = receipts.length;
  const totalVolume = receipts.reduce((sum, receipt) => {
    const metadata =
      typeof receipt.metadata === 'string' ? JSON.parse(receipt.metadata) : receipt.metadata;
    const priceSats = metadata && /^[0-9]+$/.test(String(metadata.price_sats || ''))
      ? Number(metadata.price_sats)
      : 0;
    return sum + priceSats;
  }, 0);

  const totalDisputes = Array.from(mockState.db.disputes.values()).filter(
    (dispute) => dispute.seller_principal === principal
  ).length;

  return {
    total_receipts: totalReceipts,
    total_disputes: totalDisputes,
    db_total_volume: String(totalVolume),
  };
}

function decorateService(service) {
  return {
    ...cloneRow(service),
    ...getReceiptStats(service.principal),
  };
}

async function runQuery(queryText, params = []) {
  const query = normalizeQuery(queryText);

  if (query.startsWith('select now() as current_time')) {
    return { rows: [{ current_time: new Date().toISOString() }], rowCount: 1 };
  }

  if (query.startsWith('delete from used_payments')) {
    const [pattern] = params;
    for (const [paymentTxid] of mockState.db.usedPayments) {
      if (patternMatches(paymentTxid, pattern)) {
        mockState.db.usedPayments.delete(paymentTxid);
      }
    }
    return { rows: [], rowCount: 0 };
  }

  if (query.startsWith('select request_hash from used_payments')) {
    const entry = mockState.db.usedPayments.get(params[0]);
    return {
      rows: entry ? [{ request_hash: entry.request_hash }] : [],
      rowCount: entry ? 1 : 0,
    };
  }

  if (query.startsWith('select created_at from used_payments')) {
    const entry = mockState.db.usedPayments.get(params[0]);
    return {
      rows: entry ? [{ created_at: entry.created_at }] : [],
      rowCount: entry ? 1 : 0,
    };
  }

  if (query.startsWith('select 1 from used_payments')) {
    const entry = mockState.db.usedPayments.get(params[0]);
    return {
      rows: entry ? [{ '?column?': 1 }] : [],
      rowCount: entry ? 1 : 0,
    };
  }

  if (query.startsWith('insert into used_payments')) {
    const [paymentTxid, requestHash] = params;
    mockState.db.usedPayments.set(paymentTxid, {
      payment_txid: paymentTxid,
      request_hash: requestHash,
      created_at: new Date().toISOString(),
    });
    return { rows: [], rowCount: 1 };
  }

  if (query.startsWith('delete from receipts')) {
    const [pattern] = params;
    for (const [receiptId, receipt] of mockState.db.receipts) {
      const target = query.includes('payment_txid') ? receipt.payment_txid : receipt.receipt_id;
      if (patternMatches(target, pattern)) {
        mockState.db.receipts.delete(receiptId);
      }
    }
    return { rows: [], rowCount: 0 };
  }

  if (query.startsWith('insert into receipts')) {
    const row = buildRow(parseInsertColumns(queryText), params);
    mockState.db.receipts.set(row.receipt_id, {
      seller_bns_name: null,
      buyer_principal: null,
      delivery_commitment: null,
      service_policy_hash: null,
      metadata: null,
      ...row,
    });
    return { rows: [], rowCount: 1 };
  }

  if (query.startsWith('select * from receipts where receipt_id = $1')) {
    const receipt = mockState.db.receipts.get(params[0]);
    return {
      rows: receipt ? [cloneRow(receipt)] : [],
      rowCount: receipt ? 1 : 0,
    };
  }

  if (query.startsWith('delete from services')) {
    const [value] = params;
    if (query.includes('where principal = $1')) {
      for (const [serviceId, service] of mockState.db.services) {
        if (service.principal === value) {
          mockState.db.services.delete(serviceId);
        }
      }
    } else if (query.includes('where service_id = $1')) {
      mockState.db.services.delete(Number(value));
    }
    return { rows: [], rowCount: 0 };
  }

  if (query.startsWith('select service_id from services where principal = $1')) {
    const service = Array.from(mockState.db.services.values()).find(
      (candidate) => candidate.principal === params[0]
    );
    return {
      rows: service ? [{ service_id: service.service_id }] : [],
      rowCount: service ? 1 : 0,
    };
  }

  if (query.startsWith('select * from services where service_id = $1')) {
    const service = mockState.db.services.get(Number(params[0]));
    return {
      rows: service ? [cloneRow(service)] : [],
      rowCount: service ? 1 : 0,
    };
  }

  if (query.startsWith('update services set reputation_score = $1 where principal = $2')) {
    for (const service of mockState.db.services.values()) {
      if (service.principal === params[1]) {
        service.reputation_score = params[0];
      }
    }
    return { rows: [], rowCount: 1 };
  }

  if (query.startsWith('insert into services')) {
    const row = buildRow(parseInsertColumns(queryText), params);
    const serviceId = mockState.db.nextServiceId++;
    const service = {
      service_id: serviceId,
      bns_name: null,
      policy_url: null,
      tags: [],
      pricing: null,
      reputation_score: 0,
      ...row,
    };
    mockState.db.services.set(serviceId, service);
    return {
      rows: query.includes('returning service_id') ? [{ service_id: serviceId }] : [],
      rowCount: 1,
    };
  }

  if (query.startsWith('select count(*) from services where active = true')) {
    let services = Array.from(mockState.db.services.values()).filter((service) => service.active);
    let cursor = 0;

    if (query.includes('category = $')) {
      services = services.filter((service) => service.category === params[cursor]);
      cursor += 1;
    }

    if (query.includes('supported_tokens::text like $')) {
      const token = String(params[cursor]).replace(/%/g, '').toLowerCase();
      services = services.filter((service) =>
        JSON.stringify(service.supported_tokens).toLowerCase().includes(token)
      );
    }

    return {
      rows: [{ count: String(services.length) }],
      rowCount: 1,
    };
  }

  if (
    query.includes('from services s') &&
    query.includes('(s.principal = $1 or lower(s.bns_name) = lower($1))') &&
    query.includes('and s.active = true')
  ) {
    const identifier = String(params[0]).toLowerCase();
    const service = Array.from(mockState.db.services.values())
      .filter((candidate) => candidate.active)
      .map(decorateService)
      .find(
        (candidate) =>
          candidate.principal === params[0] ||
          String(candidate.bns_name || '').toLowerCase() === identifier
      );

    return {
      rows: service ? [cloneRow(service)] : [],
      rowCount: service ? 1 : 0,
    };
  }

  if (query.includes('from services s') && query.includes('where s.active = true')) {
    let services = Array.from(mockState.db.services.values())
      .filter((service) => service.active)
      .map(decorateService)
      .sort((left, right) => {
        const leftTime = new Date(left.registered_at).getTime();
        const rightTime = new Date(right.registered_at).getTime();
        return rightTime - leftTime;
      });

    let cursor = 0;

    if (query.includes('s.category = $')) {
      services = services.filter((service) => service.category === params[cursor]);
      cursor += 1;
    }

    if (query.includes('supported_tokens::text like $')) {
      const token = String(params[cursor]).replace(/%/g, '').toLowerCase();
      services = services.filter((service) =>
        JSON.stringify(service.supported_tokens).toLowerCase().includes(token)
      );
      cursor += 1;
    }
    if (query.includes('limit $') && query.includes('offset $')) {
      const limit = Number(params[params.length - 2]);
      const offset = Number(params[params.length - 1]);
      services = services.slice(offset, offset + limit);
    }

    return {
      rows: services.map(cloneRow),
      rowCount: services.length,
    };
  }

  if (query.startsWith('delete from disputes')) {
    const [pattern] = params;
    for (const [disputeId, dispute] of mockState.db.disputes) {
      if (patternMatches(dispute.receipt_id, pattern)) {
        mockState.db.disputes.delete(disputeId);
      }
    }
    return { rows: [], rowCount: 0 };
  }

  if (query.startsWith('select dispute_id from disputes where receipt_id = $1')) {
    const dispute = Array.from(mockState.db.disputes.values()).find(
      (candidate) => candidate.receipt_id === params[0]
    );
    return {
      rows: dispute ? [{ dispute_id: dispute.dispute_id }] : [],
      rowCount: dispute ? 1 : 0,
    };
  }

  if (query.startsWith('insert into disputes')) {
    const row = buildRow(parseInsertColumns(queryText), params);
    mockState.db.disputes.set(row.dispute_id, {
      refund_amount: null,
      refund_txid: null,
      resolution_notes: null,
      resolved_at: null,
      updated_at: null,
      ...row,
    });
    return {
      rows: query.includes('returning dispute_id')
        ? [{ dispute_id: row.dispute_id }]
        : [],
      rowCount: 1,
    };
  }

  if (query.startsWith('select * from disputes where dispute_id = $1')) {
    const dispute = mockState.db.disputes.get(params[0]);
    return {
      rows: dispute ? [cloneRow(dispute)] : [],
      rowCount: dispute ? 1 : 0,
    };
  }

  if (query.startsWith('update disputes set status = $1 where dispute_id = $2')) {
    const dispute = mockState.db.disputes.get(params[1]);
    if (dispute) {
      dispute.status = params[0];
    }
    return { rows: [], rowCount: dispute ? 1 : 0 };
  }

  if (query.startsWith('update disputes set status = $1, resolution_notes = $2')) {
    const dispute = mockState.db.disputes.get(params[3]);
    if (dispute) {
      dispute.status = params[0];
      dispute.resolution_notes = params[1];
      dispute.resolved_at = params[2];
      dispute.updated_at = new Date().toISOString();
    }
    return {
      rows: dispute ? [cloneRow(dispute)] : [],
      rowCount: dispute ? 1 : 0,
    };
  }

  if (query.startsWith("update disputes set status = 'refunded'")) {
    const dispute = mockState.db.disputes.get(params[3]);
    if (dispute) {
      dispute.status = 'refunded';
      dispute.refund_amount = params[0];
      dispute.refund_txid = params[1];
      dispute.resolved_at = params[2];
      dispute.updated_at = new Date().toISOString();
    }
    return { rows: [], rowCount: dispute ? 1 : 0 };
  }

  if (query.startsWith('select count(*) from disputes where 1=1')) {
    let disputes = Array.from(mockState.db.disputes.values());
    let cursor = 0;

    if (query.includes('seller_principal = $')) {
      disputes = disputes.filter((dispute) => dispute.seller_principal === params[cursor]);
      cursor += 1;
    }

    if (query.includes('buyer_principal = $')) {
      disputes = disputes.filter((dispute) => dispute.buyer_principal === params[cursor]);
      cursor += 1;
    }

    if (query.includes('status = $')) {
      disputes = disputes.filter((dispute) => dispute.status === params[cursor]);
    }

    return {
      rows: [{ count: String(disputes.length) }],
      rowCount: 1,
    };
  }

  if (query.startsWith('select * from disputes where 1=1')) {
    let disputes = Array.from(mockState.db.disputes.values());
    let cursor = 0;

    if (query.includes('seller_principal = $')) {
      disputes = disputes.filter((dispute) => dispute.seller_principal === params[cursor]);
      cursor += 1;
    }

    if (query.includes('buyer_principal = $')) {
      disputes = disputes.filter((dispute) => dispute.buyer_principal === params[cursor]);
      cursor += 1;
    }

    if (query.includes('status = $')) {
      disputes = disputes.filter((dispute) => dispute.status === params[cursor]);
      cursor += 1;
    }

    const limit = Number(params[cursor]);
    const offset = Number(params[cursor + 1]);
    disputes = disputes
      .sort((left, right) => Number(right.created_at) - Number(left.created_at))
      .slice(offset, offset + limit);

    return {
      rows: disputes.map(cloneRow),
      rowCount: disputes.length,
    };
  }

  if (query.startsWith('delete from refund_authorizations')) {
    const [pattern] = params;
    for (const [disputeId] of mockState.db.refundAuthorizations) {
      if (patternMatches(disputeId, pattern)) {
        mockState.db.refundAuthorizations.delete(disputeId);
      }
    }
    return { rows: [], rowCount: 0 };
  }

  if (query.startsWith('insert into refund_authorizations')) {
    const row = buildRow(parseInsertColumns(queryText), params);
    const existing = mockState.db.refundAuthorizations.get(row.dispute_id);
    const record = {
      id: existing ? existing.id : mockState.db.nextRefundAuthorizationId++,
      ...row,
    };
    mockState.db.refundAuthorizations.set(row.dispute_id, record);
    return {
      rows: [{ id: record.id }],
      rowCount: 1,
    };
  }

  if (query.startsWith('update disputes set refund_amount = $1')) {
    const dispute = mockState.db.disputes.get(params[3]);
    if (dispute) {
      dispute.refund_amount = params[0];
      dispute.refund_txid = params[1];
      dispute.status = params[2];
      dispute.resolved_at = new Date().toISOString();
    }
    return { rows: [], rowCount: dispute ? 1 : 0 };
  }

  if (query.startsWith('select count(*) as delivery_count from reputation_events')) {
    const count = mockState.db.reputationEvents.filter(
      (event) => event.seller_principal === params[0]
    ).length;
    return {
      rows: [{ delivery_count: String(count) }],
      rowCount: 1,
    };
  }

  throw new Error(`Unhandled mock query: ${queryText}`);
}

class MockPool {
  on() {}

  async end() {}

  async query(queryText, params) {
    return runQuery(queryText, params);
  }
}

class MockRedis {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  async get(key) {
    return mockState.redis.has(key) ? mockState.redis.get(key) : null;
  }

  async setex(key, _ttlSeconds, value) {
    mockState.redis.set(key, value);
    return 'OK';
  }

  async del(key) {
    mockState.redis.delete(key);
    return 1;
  }

  async quit() {
    return 'OK';
  }
}

function setTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.POSTGRES_HOST = 'localhost';
  process.env.POSTGRES_PORT = '5432';
  process.env.POSTGRES_DB = 'stxact';
  process.env.POSTGRES_USER = 'stxact';
  process.env.POSTGRES_PASSWORD = 'test-password';
  process.env.STACKS_NETWORK = 'testnet';
  process.env.STACKS_API_URL = 'https://mock-stacks-api.local';
  process.env.SELLER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  process.env.SERVICE_PRINCIPAL = TEST_SERVICE_PRINCIPAL;
  process.env.SERVICE_BNS_NAME = 'service.test.btc';
  process.env.SERVICE_POLICY_HASH = crypto.createHash('sha256').update('policy').digest('hex');
  process.env.SERVICE_REGISTRY_ADDRESS = `${TEST_SERVICE_PRINCIPAL}.service-registry`;
  process.env.REPUTATION_MAP_ADDRESS = `${TEST_SERVICE_PRINCIPAL}.reputation-map`;
  process.env.DISPUTE_RESOLVER_ADDRESS = `${TEST_SERVICE_PRINCIPAL}.dispute-resolver`;
  process.env.RECEIPT_ANCHOR_ADDRESS = `${TEST_SERVICE_PRINCIPAL}.receipt-anchor`;
  process.env.ENABLE_DEMO_ROUTES = 'true';
  process.env.REQUIRE_BUYER_SIGNATURE = 'false';
  process.env.CONTRACT_CALL_FEE = '1000';
}

function parsePaymentSignature(paymentSignature) {
  try {
    return JSON.parse(Buffer.from(paymentSignature, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

setTestEnv();

jest.mock('pg', () => ({
  Pool: MockPool,
}));

jest.mock('ioredis', () => ({
  __esModule: true,
  default: MockRedis,
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async (url) => {
      if (String(url).includes('/extended/v1/tx/')) {
        const txid = String(url).split('/').pop().replace(/^0x/, '');
        return {
          data: {
            tx_status: 'success',
            block_height: 12345,
            block_hash: `block-${txid}`,
            sender_address: TEST_BUYER_PRINCIPAL,
            tx_type: 'token_transfer',
            token_transfer: {
              recipient_address: TEST_SERVICE_PRINCIPAL,
              amount: '100000',
            },
          },
        };
      }

      if (String(url).includes('policy')) {
        return { data: 'mock policy document' };
      }

      return { data: {} };
    }),
  },
}));

jest.mock('x402-stacks', () => ({
  STXtoMicroSTX: (amount) => BigInt(Math.round(Number(amount) * 1_000_000)),
  paymentMiddleware: jest.fn((config) => (req, res, next) => {
    res.set('X-stxact-Request-Hash', 'challenge-request-hash');
    res.set('X-stxact-Service-Principal', TEST_SERVICE_PRINCIPAL);

    const paymentSignature = req.get('payment-signature');
    if (!paymentSignature) {
      res
        .status(402)
        .set(
          'payment-required',
          Buffer.from(
            JSON.stringify({
              x402Version: 2,
              accepts: [
                {
                  network: config.network,
                  asset: config.asset,
                  amount: config.amount,
                  payTo: config.payTo,
                },
              ],
            })
          ).toString('base64')
        )
        .json({ error: 'payment_required' });
      next(new Error('payment required'));
      return;
    }

    const parsed = parsePaymentSignature(paymentSignature);
    if (parsed.simulateFacilitatorFailure) {
      next(new Error('facilitator unavailable'));
      return;
    }

    req.__mockPayment = {
      transaction: parsed.txid || parsed.transaction || `tx-${Date.now()}`,
      amount: String(parsed.amount || config.amount),
      payer: parsed.payer || TEST_BUYER_PRINCIPAL,
      network: config.network,
    };
    next();
  }),
  getPayment: (req) => req.__mockPayment || null,
}));

jest.mock('@stacks/transactions', () => {
  const actual = jest.requireActual('@stacks/transactions');

  return {
    ...actual,
    getNonce: jest.fn(async () => 0n),
    makeContractCall: jest.fn(async (options) => ({ options })),
    broadcastTransaction: jest.fn(async () => {
      mockState.txCounter += 1;
      return { txid: `0xmocktx${mockState.txCounter}` };
    }),
    callReadOnlyFunction: jest.fn(async ({ functionName }) => {
      if (functionName === 'get-reputation') {
        return {
          type: actual.ClarityType.ResponseOk,
          value: {
            type: actual.ClarityType.OptionalSome,
            value: {
              __mockJson: {
                score: { value: '95' },
                'last-updated': { value: '1735699200' },
              },
            },
          },
        };
      }

      return {
        type: actual.ClarityType.ResponseOk,
        value: {
          type: actual.ClarityType.OptionalNone,
        },
      };
    }),
    cvToJSON: jest.fn((clarityValue) => {
      if (clarityValue && clarityValue.__mockJson) {
        return { value: clarityValue.__mockJson };
      }

      return actual.cvToJSON(clarityValue);
    }),
  };
});

beforeEach(() => {
  setTestEnv();
  resetState();
  jest.clearAllMocks();

  try {
    const { nonceManager } = require('../../src/blockchain/nonce-manager');
    nonceManager.state.clear();
    nonceManager.locks.clear();
    nonceManager.network = null;
    nonceManager._initialized = false;
  } catch {}
});
