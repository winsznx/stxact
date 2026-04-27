import { getNetwork, type StacksNetwork } from '@/lib/network';

export interface TokenMetadata {
  symbol: string;
  decimals: number;
  network: StacksNetwork;
  contractId: string;
}

export const SBTC_METADATA: Record<StacksNetwork, TokenMetadata> = {
  mainnet: {
    symbol: 'sBTC',
    decimals: 8,
    network: 'mainnet',
    contractId: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token',
  },
  testnet: {
    symbol: 'sBTC',
    decimals: 8,
    network: 'testnet',
    contractId: 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token',
  },
};

export function getSbtcMetadata(network?: StacksNetwork): TokenMetadata {
  return SBTC_METADATA[network ?? getNetwork()];
}
