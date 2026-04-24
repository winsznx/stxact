import { StacksNetwork, StacksTestnet, StacksMainnet } from '@stacks/network';

/**
 * Get configured Stacks network
 */
export function getStacksNetwork(): StacksNetwork {
  const network = process.env.STACKS_NETWORK || 'testnet';
  const apiUrl = process.env.STACKS_API_URL;

  if (network === 'mainnet') {
    return new StacksMainnet({ url: apiUrl });
  }

  return new StacksTestnet({ url: apiUrl });
}


/**
 * Discriminated union of valid Stacks execution environments.
 */
export type NetworkId = 'mainnet' | 'testnet' | 'mocknet';
export const isNetworkId = (n: unknown): n is NetworkId => typeof n === 'string' && ['mainnet', 'testnet', 'mocknet'].includes(n);
