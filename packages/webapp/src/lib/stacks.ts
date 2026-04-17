import { STACKS_EXPLORER_BASE, STACKS_ADDRESS_REGEX } from '@/lib/constants';

export function getTransactionUrl(txId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const normalizedId = txId.startsWith('0x') ? txId : `0x${txId}`;
  const chain = network === 'mainnet' ? 'mainnet' : 'testnet';
  return `${STACKS_EXPLORER_BASE}/txid/${normalizedId}?chain=${chain}`;
}

export function getAddressUrl(principal: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const chain = network === 'mainnet' ? 'mainnet' : 'testnet';
  return `${STACKS_EXPLORER_BASE}/address/${principal}?chain=${chain}`;
}

export function isValidStacksAddress(address: string): boolean {
  return STACKS_ADDRESS_REGEX.test(address);
}

export function getContractId(address: string, contractName: string): string {
  return `${address}.${contractName}`;
}
