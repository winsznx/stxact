import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { getPool } from '../storage/db';
import { verifyBNSOwnership } from '../identity/bns';
import { logger } from '../config/logger';
import { getOnChainReputation } from '../utils/reputation';
import { recoverPrincipalFromMessageSignature } from '../crypto/signatures';

const router = Router();

/**
 * GET /directory/services
 * Query the service directory with filters
 *
 * PRD Reference: Section 7 - Endpoint: List Services (lines 740-781)
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    const minReputation = parseInt((req.query.min_reputation as string) || '0', 10);
    const supportedToken = (req.query.supported_token as string) || (req.query.token as string);
    const category = req.query.category as string;
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const pool = getPool();

    let query = `
      SELECT
        s.*,
        COALESCE(receipt_stats.total_receipts, 0)::int AS total_receipts,
        COALESCE(dispute_stats.total_disputes, 0)::int AS total_disputes,
        COALESCE(receipt_stats.total_volume_sats, 0)::text AS db_total_volume
      FROM services s
      LEFT JOIN (
        SELECT
          seller_principal,
          COUNT(*) AS total_receipts,
          SUM(
            CASE
              WHEN COALESCE(metadata->>'price_sats', '') ~ '^[0-9]+$'
                THEN (metadata->>'price_sats')::numeric
              ELSE 0
            END
          ) AS total_volume_sats
        FROM receipts
        GROUP BY seller_principal
      ) receipt_stats ON receipt_stats.seller_principal = s.principal
      LEFT JOIN (
        SELECT seller_principal, COUNT(*) AS total_disputes
        FROM disputes
        GROUP BY seller_principal
      ) dispute_stats ON dispute_stats.seller_principal = s.principal
      WHERE s.active = true
    `;
    const values: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (category) {
      query += ` AND s.category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    if (supportedToken) {
      query += ` AND s.supported_tokens::text LIKE $${paramIndex}`;
      values.push(`%${supportedToken}%`);
      paramIndex++;
    }

    // Order by registration date (most recent first)
    query += ' ORDER BY s.registered_at DESC';

    // Apply SQL pagination only when no on-chain min_reputation filter is requested.
    // min_reputation depends on asynchronous on-chain reads, so we paginate after filtering.
    if (minReputation <= 0) {
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);
    }

    const result = await pool.query(query, values);

    let total = 0;
    if (minReputation <= 0) {
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM services WHERE active = true';
      const countValues: any[] = [];
      let countParamIndex = 1;

      if (category) {
        countQuery += ` AND category = $${countParamIndex}`;
        countValues.push(category);
        countParamIndex++;
      }

      if (supportedToken) {
        countQuery += ` AND supported_tokens::text LIKE $${countParamIndex}`;
        countValues.push(`%${supportedToken}%`);
      }

      const countResult = await pool.query(countQuery, countValues);
      total = parseInt(countResult.rows[0].count, 10);
    }

    // Format services with on-chain reputation
    const services = await Promise.all(
      result.rows.map(async (row) => {
        const reputationData = await getOnChainReputation(row.principal);
        const totalReceipts = Number(row.total_receipts || 0);
        const totalDisputes = Number(row.total_disputes || 0);
        const successRate =
          totalReceipts > 0 ? Math.max(0, (totalReceipts - totalDisputes) / totalReceipts) : 1.0;
        const totalVolume =
          reputationData?.totalVolume && reputationData.totalVolume !== '0'
            ? reputationData.totalVolume
            : String(row.db_total_volume || '0');

        return {
          service_id: row.service_id,
          principal: row.principal,
          bns_name: row.bns_name,
          endpoint_url: row.endpoint_url,
          policy_hash: row.policy_hash,
          policy_url: row.policy_url,
          category: row.category,
          tags: row.tags,
          supported_tokens: row.supported_tokens,
          pricing: row.pricing,
          reputation: {
            score: reputationData?.score || 0,
            success_rate: successRate,
            total_volume: totalVolume,
          },
          total_deliveries: totalReceipts,
          total_disputes: totalDisputes,
          stake: {
            amount_stx: (Number(row.stake_amount || 0) / 1_000_000).toString(),
            bonded: row.active,
          },
          registered_at: row.registered_at,
        };
      })
    );

    // Filter by minimum reputation if specified
    const filteredServices =
      minReputation > 0
        ? services.filter((s) => s.reputation.score >= minReputation)
        : services;

    const paginatedServices =
      minReputation > 0 ? filteredServices.slice(offset, offset + limit) : filteredServices;
    const responseTotal = minReputation > 0 ? filteredServices.length : total;

    res.status(200).json({
      services: paginatedServices,
      pagination: {
        total: responseTotal,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Failed to list services', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to list services',
    });
  }
});

/**
 * GET /directory/services/:principal
 * Get a single service by Stacks principal or BNS name
 */
router.get('/services/:principal', async (req: Request, res: Response) => {
  try {
    const { principal: identifier } = req.params;
    const isPrincipal = /^S[TP][0-9A-Z]{38,40}$/.test(identifier);
    const isBnsName = /^[a-z0-9-]+\.btc$/i.test(identifier);

    if (!isPrincipal && !isBnsName) {
      res.status(400).json({
        error: 'invalid_service_identifier',
        message: 'Identifier must be a valid Stacks principal or BNS name',
      });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      `
        SELECT
          s.*,
          COALESCE(receipt_stats.total_receipts, 0)::int AS total_receipts,
          COALESCE(dispute_stats.total_disputes, 0)::int AS total_disputes,
          COALESCE(receipt_stats.total_volume_sats, 0)::text AS db_total_volume
        FROM services s
        LEFT JOIN (
          SELECT
            seller_principal,
            COUNT(*) AS total_receipts,
            SUM(
              CASE
                WHEN COALESCE(metadata->>'price_sats', '') ~ '^[0-9]+$'
                  THEN (metadata->>'price_sats')::numeric
                ELSE 0
              END
            ) AS total_volume_sats
          FROM receipts
          GROUP BY seller_principal
        ) receipt_stats ON receipt_stats.seller_principal = s.principal
        LEFT JOIN (
          SELECT seller_principal, COUNT(*) AS total_disputes
          FROM disputes
          GROUP BY seller_principal
        ) dispute_stats ON dispute_stats.seller_principal = s.principal
        WHERE (s.principal = $1 OR LOWER(s.bns_name) = LOWER($1)) AND s.active = true
      `,
      [identifier]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'service_not_found',
        message: `Service with identifier ${identifier} not found`,
      });
      return;
    }

    const service = result.rows[0];

    // Query on-chain reputation
    const reputationData = await getOnChainReputation(service.principal);
    const totalReceipts = Number(service.total_receipts || 0);
    const totalDisputes = Number(service.total_disputes || 0);
    const successRate =
      totalReceipts > 0 ? Math.max(0, (totalReceipts - totalDisputes) / totalReceipts) : 1.0;
    const totalVolume =
      reputationData?.totalVolume && reputationData.totalVolume !== '0'
        ? reputationData.totalVolume
        : String(service.db_total_volume || '0');
    const score = reputationData?.score || 0;

    res.status(200).json({
      principal: service.principal,
      bns_name: service.bns_name,
      endpoint_url: service.endpoint_url,
      policy_hash: service.policy_hash,
      policy_url: service.policy_url,
      category: service.category,
      supported_tokens: service.supported_tokens,
      reputation_score: score,
      total_volume: totalVolume,
      reputation: {
        score,
        success_rate: successRate,
        total_volume: totalVolume,
      },
      total_deliveries: totalReceipts,
      total_disputes: totalDisputes,
      stake: {
        amount_stx: (Number(service.stake_amount || 0) / 1_000_000).toString(),
        bonded: service.active,
      },
      registered_at: Math.floor(new Date(service.registered_at).getTime() / 1000),
    });
  } catch (error) {
    logger.error('Failed to get service by identifier', {
      error: error instanceof Error ? error.message : 'Unknown error',
      identifier: req.params.principal,
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to retrieve service',
    });
  }
});

/**
 * POST /directory/register
 * Register a new service in the directory
 *
 * PRD Reference: Section 7 - Endpoint: Register Service (lines 783-829)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      endpoint_url,
      policy_hash,
      bns_name,
      category,
      supported_tokens,
      signature,
      timestamp,
    } = req.body;

    // Validate required fields
    if (!endpoint_url || !policy_hash || !category || !supported_tokens || !signature || !timestamp) {
      res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: endpoint_url, policy_hash, category, supported_tokens, signature, timestamp',
      });
      return;
    }

    if (!Array.isArray(supported_tokens) || supported_tokens.length === 0) {
      res.status(400).json({
        error: 'invalid_supported_tokens',
        message: 'supported_tokens must be a non-empty array',
      });
      return;
    }

    const sellerPrincipal = process.env.SERVICE_PRINCIPAL!;
    const normalizedPolicyHash = String(policy_hash).toLowerCase();
    const parsedTimestamp = parseInt(String(timestamp), 10);

    if (!Number.isFinite(parsedTimestamp) || parsedTimestamp <= 0) {
      res.status(400).json({
        error: 'invalid_timestamp',
        message: 'timestamp must be a valid unix timestamp in seconds',
      });
      return;
    }

    const signatureMaxAge = parseInt(process.env.REGISTRATION_SIGNATURE_MAX_AGE_SECONDS || '900', 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parsedTimestamp) > signatureMaxAge) {
      res.status(422).json({
        error: 'signature_expired',
        message: `Registration signature timestamp is outside the allowed ${signatureMaxAge}s window`,
      });
      return;
    }

    if (!/^[0-9a-f]{64}$/.test(normalizedPolicyHash)) {
      res.status(400).json({
        error: 'invalid_policy_hash',
        message: 'policy_hash must be a 64-character lowercase hex string',
      });
      return;
    }

    let normalizedEndpointUrl: string;
    try {
      normalizedEndpointUrl = new URL(endpoint_url).toString();
    } catch {
      res.status(400).json({
        error: 'invalid_endpoint_url',
        message: 'endpoint_url must be a valid URL',
      });
      return;
    }

    const endpointUrlHash = createHash('sha256').update(normalizedEndpointUrl).digest('hex');
    const canonicalRegistrationMessage = [
      'STXACT-REGISTER',
      endpointUrlHash,
      normalizedPolicyHash,
      bns_name || '',
      parsedTimestamp.toString(),
    ].join(':');

    const recoveredPrincipal = recoverPrincipalFromMessageSignature(
      canonicalRegistrationMessage,
      signature,
      sellerPrincipal
    );

    if (!recoveredPrincipal || recoveredPrincipal !== sellerPrincipal) {
      res.status(422).json({
        error: 'invalid_signature',
        message: 'Registration signature is invalid or does not match configured service principal',
      });
      return;
    }

    // Verify BNS name ownership if provided
    if (bns_name) {
      const bnsValid = await verifyBNSOwnership(bns_name, sellerPrincipal);

      if (!bnsValid) {
        res.status(422).json({
          error: 'bns_verification_failed',
          message: `BNS name ${bns_name} is not owned by ${sellerPrincipal}`,
        });
        return;
      }
    }

    // Verify policy hash matches policy URL
    if (req.body.policy_url) {
      const policyVerified = await verifyPolicyHash(req.body.policy_url, normalizedPolicyHash);

      if (!policyVerified) {
        res.status(422).json({
          error: 'policy_hash_mismatch',
          message: 'Policy hash does not match policy URL content',
        });
        return;
      }
    }

    // Check if principal already registered
    const pool = getPool();
    const existingResult = await pool.query(
      'SELECT service_id FROM services WHERE principal = $1',
      [sellerPrincipal]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({
        error: 'already_registered',
        message: `Principal ${sellerPrincipal} is already registered`,
      });
      return;
    }

    // Insert service into database
    const insertQuery = `
      INSERT INTO services (
        principal, bns_name, endpoint_url, policy_hash, policy_url,
        category, tags, supported_tokens, pricing, registered_at,
        stake_amount, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING service_id
    `;

    const insertValues = [
      sellerPrincipal,
      bns_name || null,
      normalizedEndpointUrl,
      normalizedPolicyHash,
      req.body.policy_url || null,
      category,
      req.body.tags || [],
      supported_tokens,
      req.body.pricing || null,
      new Date(),
      100_000_000, // Default stake: 100 STX
      true,
    ];

    const insertResult = await pool.query(insertQuery, insertValues);
    const serviceId = insertResult.rows[0].service_id;

    logger.info('Service registered in database', {
      service_id: serviceId,
      principal: sellerPrincipal,
      bns_name,
      category,
    });

    // Register service on-chain via service-registry.clar
    const {
      makeContractCall,
      broadcastTransaction,
      stringAsciiCV,
      bufferCV,
      someCV,
      noneCV,
      uintCV,
      AnchorMode,
    } = await import('@stacks/transactions');
    const { getStacksNetwork } = await import('../config/stacks');

    const network = getStacksNetwork();
    const sellerPrivateKey = process.env.SELLER_PRIVATE_KEY!;
    const [contractAddress, contractName] = process.env.SERVICE_REGISTRY_ADDRESS!.split('.');

    // Import nonce manager for atomic nonce allocation
    const { nonceManager } = await import('../blockchain/nonce-manager');
    const senderAddress = process.env.SERVICE_PRINCIPAL!;

    // Initialize nonce manager if first use
    if (!(nonceManager as any)._initialized) {
      await nonceManager.initialize(network);
      (nonceManager as any)._initialized = true;
    }

    const nonce = await nonceManager.allocateNonce(senderAddress);

    // Prepare contract call arguments
    const registrationTx = await makeContractCall({
      contractAddress,
      contractName,
      functionName: 'register-service',
      functionArgs: [
        bufferCV(Buffer.from(endpointUrlHash, 'hex')),
        bufferCV(Buffer.from(normalizedPolicyHash, 'hex')),
        bns_name ? someCV(stringAsciiCV(bns_name)) : noneCV(),
        uintCV(100_000_000), // stake_amount: 100 STX default
      ],
      senderKey: sellerPrivateKey,
      network,
      anchorMode: AnchorMode.Any,
      nonce,
      fee: BigInt(process.env.CONTRACT_CALL_FEE || '1000'),
    });

    // Type annotation required: broadcastTransaction return type causes narrowing issues with TypeScript
    // @stacks/transactions doesn't export a proper type for the response, using any with explicit check below
    const broadcastResponse: any = await broadcastTransaction(registrationTx, network);

    if (broadcastResponse.error) {
      // Mark nonce as failed for retry
      await nonceManager.markFailed(senderAddress, nonce);

      logger.error('Failed to broadcast service registration transaction', {
        service_id: serviceId,
        error: broadcastResponse.error,
        reason: broadcastResponse.reason,
      });

      // Delete database entry since on-chain registration failed
      await pool.query('DELETE FROM services WHERE service_id = $1', [serviceId]);

      res.status(500).json({
        error: 'registration_broadcast_failed',
        message: 'Blockchain registration transaction failed; service registration was rolled back',
        details: broadcastResponse.reason || broadcastResponse.error,
      });
      return;
    }

    const registrationTxid = broadcastResponse.txid;

    // Mark nonce as confirmed (synchronous, non-blocking)
    try {
      nonceManager.markConfirmed(senderAddress, nonce);
    } catch (err) {
      logger.warn('Failed to mark nonce as confirmed (non-critical)', { error: err });
    }

    logger.info('Service registered on-chain', {
      service_id: serviceId,
      tx_hash: registrationTxid,
      principal: sellerPrincipal,
      bns_name,
      category,
    });

    res.status(201).json({
      service_id: serviceId,
      status: 'registered',
      tx_hash: registrationTxid,
    });
  } catch (error) {
    logger.error('Failed to register service', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to register service',
    });
  }
});

/**
 * Helper: Verify policy hash matches policy URL content
 */
async function verifyPolicyHash(policyUrl: string, expectedHash: string): Promise<boolean> {
  try {
    const axios = await import('axios');
    const response = await axios.default.get(policyUrl, {
      timeout: 10000,
      responseType: 'text',
    });

    const policyContent = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);

    const actualHash = createHash('sha256').update(policyContent).digest('hex');

    return actualHash === expectedHash.toLowerCase();
  } catch (error) {
    logger.warn('Policy hash verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      policy_url: policyUrl,
    });

    return false;
  }
}

export default router;
