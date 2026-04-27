import { callReadOnlyFunction, bufferCV, ClarityType } from '@stacks/transactions';
import { getNetworkId } from '../config/network';
import { StacksNetwork, StacksTestnet, StacksMainnet } from '@stacks/network';
import { getBNSCacheEntry, setBNSCacheEntry, invalidateBNSCache } from '../storage/cache';
import { logger } from '../config/logger';

/**
 * BNS (Bitcoin Name System) Verification
 *
 * Resolves BNS names to Stacks principals and verifies ownership.
 * Uses caching with 1-hour TTL to reduce on-chain queries.
 *
 * PRD Reference: Section 9 - Identity Layer (lines 1277-1330)
 */

const BNS_CONTRACT_ADDRESS = 'SP000000000000000000002Q6VF78';
const BNS_CONTRACT_NAME = 'bns';

function getStacksNetwork(): StacksNetwork {
  const network = getNetworkId();
  return network === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
}

/**
 * Verify BNS name ownership
 *
 * @param bnsName - BNS name (e.g., "yield-api.btc")
 * @param expectedPrincipal - Expected owner principal
 * @returns true if owner matches expected principal, false otherwise
 */
export async function verifyBNSOwnership(
  bnsName: string,
  expectedPrincipal: string
): Promise<boolean> {
  try {
    // Check cache first
    const cachedOwner = await getBNSCacheEntry(bnsName);
    if (cachedOwner) {
      const matches = cachedOwner === expectedPrincipal;

      logger.debug('BNS cache hit', {
        bns_name: bnsName,
        cached_owner: cachedOwner,
        expected_principal: expectedPrincipal,
        matches,
      });

      return matches;
    }

    // Cache miss, query on-chain
    const owner = await resolveBNSOwner(bnsName);

    if (!owner) {
      logger.warn('BNS name not found', { bns_name: bnsName });
      return false;
    }

    // Cache the result
    await setBNSCacheEntry(bnsName, owner);

    const matches = owner === expectedPrincipal;

    logger.info('BNS ownership verified', {
      bns_name: bnsName,
      owner,
      expected_principal: expectedPrincipal,
      matches,
    });

    return matches;
  } catch (error) {
    logger.error('BNS verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bns_name: bnsName,
      expected_principal: expectedPrincipal,
    });

    return false;
  }
}

/**
 * Resolve BNS name to owner principal
 *
 * @param bnsName - BNS name (e.g., "yield-api.btc")
 * @returns Owner principal or null if not found
 */
export async function resolveBNSOwner(bnsName: string): Promise<string | null> {
  try {
    const [name, namespace] = bnsName.split('.');

    if (!name || !namespace) {
      throw new Error(`Invalid BNS name format: ${bnsName}`);
    }

    const network = getStacksNetwork();

    logger.debug('Resolving BNS name on-chain', {
      bns_name: bnsName,
      name,
      namespace,
      network: network.isMainnet() ? 'mainnet' : 'testnet',
    });

    const result = await callReadOnlyFunction({
      contractAddress: BNS_CONTRACT_ADDRESS,
      contractName: BNS_CONTRACT_NAME,
      functionName: 'name-resolve',
      functionArgs: [bufferCV(Buffer.from(name)), bufferCV(Buffer.from(namespace))],
      network,
      senderAddress: BNS_CONTRACT_ADDRESS,
    });

    if (result.type === ClarityType.ResponseOk) {
      const data = result.value as { data?: { owner?: { address?: string } } };
      const owner = data.data?.owner?.address || null;

      logger.info('BNS name resolved', {
        bns_name: bnsName,
        owner,
      });

      return owner;
    }

    logger.warn('BNS name resolution returned error', {
      bns_name: bnsName,
      result_type: result.type,
    });

    return null;
  } catch (error) {
    logger.error('Failed to resolve BNS name', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bns_name: bnsName,
    });

    throw error;
  }
}

/**
 * Invalidate BNS cache for a name
 * Called when a BNS transfer event is detected
 *
 * @param bnsName - BNS name to invalidate
 */
export async function invalidateBNS(bnsName: string): Promise<void> {
  await invalidateBNSCache(bnsName);

  logger.info('BNS cache invalidated', { bns_name: bnsName });
}

/**
 * Batch verify multiple BNS names
 * Useful for directory listing verification
 *
 * @param bnsNames - Array of BNS name/principal pairs
 * @returns Map of BNS names to verification results
 */
export async function batchVerifyBNS(
  bnsNames: Array<{ bnsName: string; expectedPrincipal: string }>
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  await Promise.all(
    bnsNames.map(async ({ bnsName, expectedPrincipal }) => {
      const verified = await verifyBNSOwnership(bnsName, expectedPrincipal);
      results.set(bnsName, verified);
    })
  );

  return results;
}
