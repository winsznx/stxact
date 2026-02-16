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
