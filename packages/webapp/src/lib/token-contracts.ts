import { getNetwork, type StacksNetwork } from '@/lib/network';

interface TokenContract {
  address: string;
  name: string;
}

const SBTC_CONTRACTS: Record<StacksNetwork, TokenContract> = {
  mainnet: { address: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4', name: 'sbtc-token' },
  testnet: { address: 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT', name: 'sbtc-token' },
};

const BNS_CONTRACTS: Record<StacksNetwork, TokenContract> = {
  mainnet: { address: 'SP000000000000000000002Q6VF78', name: 'bns' },
  testnet: { address: 'ST000000000000000000002AMW42H', name: 'bns' },
};

export function getSbtcContract(network?: StacksNetwork): TokenContract {
  return SBTC_CONTRACTS[network ?? getNetwork()];
}

export function getSbtcContractId(network?: StacksNetwork): string {
  const c = getSbtcContract(network);
  return `${c.address}.${c.name}`;
}

export function getBnsContract(network?: StacksNetwork): TokenContract {
  return BNS_CONTRACTS[network ?? getNetwork()];
}

export function getBnsContractId(network?: StacksNetwork): string {
  const c = getBnsContract(network);
  return `${c.address}.${c.name}`;
}
