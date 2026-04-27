import { z } from 'zod';

export type StacksNetwork = 'mainnet' | 'testnet';

const networkSchema = z.enum(['mainnet', 'testnet']);

const HIRO_API_URLS: Record<StacksNetwork, string> = {
  mainnet: 'https://api.mainnet.hiro.so',
  testnet: 'https://api.testnet.hiro.so',
};

let cachedNetwork: StacksNetwork | null = null;

export function getNetwork(): StacksNetwork {
  if (cachedNetwork) return cachedNetwork;

  const raw = process.env.NEXT_PUBLIC_STACKS_NETWORK;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_STACKS_NETWORK is required in production');
    }
    cachedNetwork = 'testnet';
    return cachedNetwork;
  }

  const parsed = networkSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid NEXT_PUBLIC_STACKS_NETWORK: ${raw}`);
  }
  cachedNetwork = parsed.data;
  return cachedNetwork;
}

export function isMainnet(): boolean {
  return getNetwork() === 'mainnet';
}

export function isTestnet(): boolean {
  return getNetwork() === 'testnet';
}

export function getStacksApiUrl(): string {
  const override = process.env.NEXT_PUBLIC_STACKS_API_URL;
  if (override) return override;
  return HIRO_API_URLS[getNetwork()];
}

export function resetNetworkCache(): void {
  cachedNetwork = null;
}
