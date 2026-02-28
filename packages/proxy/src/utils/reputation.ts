import { callReadOnlyFunction, cvToJSON, principalCV, ClarityType } from '@stacks/transactions';
import { getStacksNetwork } from '../config/stacks';
import { logger } from '../config/logger';

export interface ReputationData {
  score: number;
  totalVolume: string;
  lastUpdated: number;
}

/**
 * Query on-chain reputation for a seller principal
 * Returns null if no reputation data exists or on error
 */
export async function getOnChainReputation(principal: string): Promise<ReputationData | null> {
  try {
    // Validate principal format
    if (!/^S[TP][0-9A-Z]{38,40}$/.test(principal)) {
      logger.warn('Invalid principal format for reputation query', { principal });
      return null;
    }

    // Check if reputation contract is configured
    if (!process.env.REPUTATION_MAP_ADDRESS) {
      logger.warn('REPUTATION_MAP_ADDRESS not configured, skipping on-chain query');
      return null;
    }

    const network = getStacksNetwork();
    const [contractAddress, contractName] = process.env.REPUTATION_MAP_ADDRESS.split('.');

    // Call on-chain read-only function
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-reputation',
      functionArgs: [principalCV(principal)],
      network,
      senderAddress: principal,
    });

    if (result.type !== ClarityType.ResponseOk) {
      logger.warn('On-chain reputation call returned non-ok response', {
        principal,
        response_type: result.type,
      });
      return null;
    }

    // get-reputation returns: (response (optional { ...tuple... }) ...)
    if (result.value.type === ClarityType.OptionalNone) {
      return null;
    }

    if (result.value.type !== ClarityType.OptionalSome) {
      logger.warn('Unexpected reputation response payload type', {
        principal,
        payload_type: result.value.type,
      });
      return null;
    }

    const reputationData = cvToJSON(result.value.value).value as any;

    const scoreRaw = reputationData['score']?.value ?? reputationData['score'] ?? '0';
    const lastUpdatedRaw = reputationData['last-updated']?.value ?? reputationData['last-updated'] ?? '0';

    return {
      score: parseInt(String(scoreRaw), 10),
      // Current reputation contract does not track total volume directly.
      totalVolume: '0',
      lastUpdated: parseInt(String(lastUpdatedRaw), 10),
    };
  } catch (error) {
    logger.error('Failed to query on-chain reputation', {
      principal,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}
