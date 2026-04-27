import { getNetwork } from '@/lib/network';

const DEFAULTS = {
  mainnet: 6,
  testnet: 1,
} as const;

export function getDisplayConfirmationDepth(): number {
  return DEFAULTS[getNetwork()];
}

export function getConfirmationLabel(): string {
  const n = getDisplayConfirmationDepth();
  return n === 1 ? '1 confirmation' : `${n} confirmations`;
}
