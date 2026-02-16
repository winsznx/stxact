import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { getPool } from '../storage/db';
import { verifyBNSOwnership } from '../identity/bns';
import { logger } from '../config/logger';
import { getOnChainReputation } from '../utils/reputation';

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
    const supportedToken = req.query.supported_token as string;
    const category = req.query.category as string;
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const pool = getPool();

    let query = 'SELECT * FROM services WHERE active = true';
    const values: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (category) {
      query += ` AND category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    if (supportedToken) {
      query += ` AND supported_tokens::text LIKE $${paramIndex}`;
      values.push(`%${supportedToken}%`);
      paramIndex++;
    }

    // Order by registration date (most recent first)
    query += ' ORDER BY registered_at DESC';

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

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
    const total = parseInt(countResult.rows[0].count, 10);

    // Format services with on-chain reputation
    const services = await Promise.all(
      result.rows.map(async (row) => {
        const reputationData = await getOnChainReputation(row.principal);

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
            success_rate: 1.0,
            total_volume: reputationData?.totalVolume || '0',
          },
          stake: {
            amount_stx: (row.stake_amount / 1_000_000).toString(),
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

    res.status(200).json({
      services: filteredServices,
      pagination: {
        total,
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
 * Get a single service by Stacks principal
 */
router.get('/services/:principal', async (req: Request, res: Response) => {
  try {
    const { principal } = req.params;

    // Validate Stacks principal format (ST/SP + 38-40 chars alphanumeric)
    if (!/^S[TP][0-9A-Z]{38,40}$/.test(principal)) {
      res.status(400).json({
        error: 'invalid_principal',
        message: 'Invalid Stacks principal format',
      });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM services WHERE principal = $1 AND active = true',
      [principal]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'service_not_found',
        message: `Service with principal ${principal} not found`,
      });
      return;
    }

    const service = result.rows[0];

    // Query on-chain reputation
    const reputationData = await getOnChainReputation(service.principal);

    res.status(200).json({
      principal: service.principal,
      bns_name: service.bns_name,
      endpoint_url: service.endpoint_url,
      policy_hash: service.policy_hash,
      policy_url: service.policy_url,
      category: service.category,
      supported_tokens: service.supported_tokens,
      reputation_score: reputationData?.score || 0,
      total_volume: reputationData?.totalVolume || '0',
      registered_at: parseInt(service.registered_at, 10),
    });
  } catch (error) {
    logger.error('Failed to get service by principal', {
      error: error instanceof Error ? error.message : 'Unknown error',
      principal: req.params.principal,
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
    } = req.body;

    // Validate required fields
    if (!endpoint_url || !policy_hash || !category || !supported_tokens) {
      res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: endpoint_url, policy_hash, category, supported_tokens',
      });
      return;
    }

    // Extract seller principal from signature (simplified - in production, verify signature)
    // For now, use SERVICE_PRINCIPAL from env
    const sellerPrincipal = process.env.SERVICE_PRINCIPAL!;

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
      const policyVerified = await verifyPolicyHash(req.body.policy_url, policy_hash);

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
      endpoint_url,
      policy_hash,
      req.body.policy_url || null,
      category,
      req.body.tags || [],
      JSON.stringify(supported_tokens),
      req.body.pricing ? JSON.stringify(req.body.pricing) : null,
      Math.floor(Date.now() / 1000), // Current timestamp in seconds
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
      bufferCVFromString,
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
        stringAsciiCV(endpoint_url),
        bufferCVFromString(policy_hash),
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
        message: 'Service registered in database but blockchain transaction failed',
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
