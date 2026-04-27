import {
  STACKS_EXPLORER_BASE,
  STACKS_ADDRESS_REGEX,
  STACKS_MAINNET_ADDRESS_REGEX,
  STACKS_TESTNET_ADDRESS_REGEX,
} from '@/lib/constants';
import { getNetwork, type StacksNetwork } from '@/lib/network';

export function getTransactionUrl(txId: string, network?: StacksNetwork): string {
  const chain = network ?? getNetwork();
  const normalizedId = txId.startsWith('0x') ? txId : `0x${txId}`;
  return `${STACKS_EXPLORER_BASE}/txid/${normalizedId}?chain=${chain}`;
}

export function getAddressUrl(principal: string, network?: StacksNetwork): string {
  const chain = network ?? getNetwork();
  return `${STACKS_EXPLORER_BASE}/address/${principal}?chain=${chain}`;
}

export function isValidStacksAddress(address: string): boolean {
  return STACKS_ADDRESS_REGEX.test(address);
}

export function isMainnetAddress(address: string): boolean {
  return STACKS_MAINNET_ADDRESS_REGEX.test(address);
}

export function isTestnetAddress(address: string): boolean {
  return STACKS_TESTNET_ADDRESS_REGEX.test(address);
}

export function isAddressOnNetwork(address: string, network: StacksNetwork): boolean {
  return network === 'mainnet' ? isMainnetAddress(address) : isTestnetAddress(address);
}

export function getContractId(address: string, contractName: string): string {
  return `${address}.${contractName}`;
}
