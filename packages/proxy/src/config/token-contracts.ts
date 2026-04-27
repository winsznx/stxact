import { getNetworkId, type NetworkId } from './network';

interface TokenContract {
  address: string;
  name: string;
}

type NetworkScope = Exclude<NetworkId, 'mocknet'>;

const SBTC_CONTRACTS: Record<NetworkScope, TokenContract> = {
  mainnet: { address: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4', name: 'sbtc-token' },
  testnet: { address: 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT', name: 'sbtc-token' },
};

const BNS_CONTRACTS: Record<NetworkScope, TokenContract> = {
  mainnet: { address: 'SP000000000000000000002Q6VF78', name: 'bns' },
  testnet: { address: 'ST000000000000000000002AMW42H', name: 'bns' },
};

function scopeNetwork(network: NetworkId): NetworkScope {
  return network === 'mocknet' ? 'testnet' : network;
}

export function getSbtcContract(network?: NetworkId): TokenContract {
  return SBTC_CONTRACTS[scopeNetwork(network ?? getNetworkId())];
}

export function getSbtcContractId(network?: NetworkId): string {
  const c = getSbtcContract(network);
  return `${c.address}.${c.name}`;
}

export function getBnsContract(network?: NetworkId): TokenContract {
  return BNS_CONTRACTS[scopeNetwork(network ?? getNetworkId())];
}

export function getBnsContractId(network?: NetworkId): string {
  const c = getBnsContract(network);
  return `${c.address}.${c.name}`;
}
