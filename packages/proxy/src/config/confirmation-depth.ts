import { getNetworkId } from './network';

const DEFAULTS = {
  mainnet: 6,
  testnet: 1,
  mocknet: 0,
} as const;

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export function getConfirmationDepth(): number {
  const network = getNetworkId();
  if (network === 'mainnet') {
    return parsePositiveInt(process.env.CONFIRMATION_DEPTH_MAINNET) ?? DEFAULTS.mainnet;
  }
  if (network === 'testnet') {
    return parsePositiveInt(process.env.CONFIRMATION_DEPTH_TESTNET) ?? DEFAULTS.testnet;
  }
  return DEFAULTS.mocknet;
}

export function isConfirmedAtDepth(blockHeight: number, currentTip: number): boolean {
  const depth = getConfirmationDepth();
  return currentTip - blockHeight >= depth;
}
