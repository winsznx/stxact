import { StacksNetwork, StacksTestnet, StacksMainnet } from '@stacks/network';

export type NetworkId = 'mainnet' | 'testnet' | 'mocknet';

const HIRO_API_URLS: Record<'mainnet' | 'testnet', string> = {
  mainnet: 'https://api.mainnet.hiro.so',
  testnet: 'https://api.testnet.hiro.so',
};

let cachedNetwork: NetworkId | null = null;

export function isNetworkId(value: unknown): value is NetworkId {
  return typeof value === 'string' && ['mainnet', 'testnet', 'mocknet'].includes(value);
}

export function getNetworkId(): NetworkId {
  if (cachedNetwork) return cachedNetwork;

  const raw = process.env.STACKS_NETWORK;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('STACKS_NETWORK is required in production');
    }
    cachedNetwork = 'testnet';
    return cachedNetwork;
  }

  if (!isNetworkId(raw)) {
    throw new Error(`Invalid STACKS_NETWORK: ${raw}`);
  }
  cachedNetwork = raw;
  return cachedNetwork;
}

export function isMainnet(): boolean {
  return getNetworkId() === 'mainnet';
}

export function isTestnet(): boolean {
  return getNetworkId() === 'testnet';
}

export function getStacksApiUrl(): string {
  const override = process.env.STACKS_API_URL;
  if (override) return override;
  const network = getNetworkId();
  if (network === 'mocknet') return override ?? 'http://localhost:3999';
  return HIRO_API_URLS[network];
}

export function getStacksNetwork(): StacksNetwork {
  const apiUrl = getStacksApiUrl();
  return isMainnet() ? new StacksMainnet({ url: apiUrl }) : new StacksTestnet({ url: apiUrl });
}

export function resetNetworkCache(): void {
  cachedNetwork = null;
}

export function networkLabel(): string {
  return getNetworkId().toUpperCase();
}
