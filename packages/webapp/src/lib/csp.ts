import type { StacksNetwork } from '@/lib/network';

const HIRO_API_URLS: Record<StacksNetwork, string> = {
  mainnet: 'https://api.mainnet.hiro.so',
  testnet: 'https://api.testnet.hiro.so',
};

export function buildConnectSrc(network: StacksNetwork, extra: readonly string[] = []): string {
  const sources = new Set<string>([
    "'self'",
    HIRO_API_URLS[network],
    'https://*.stacks.co',
    'wss://*.walletconnect.com',
    'wss://*.walletconnect.org',
    ...extra,
  ]);
  return Array.from(sources).join(' ');
}

export function buildContentSecurityPolicy(network: StacksNetwork): string {
  const directives: Record<string, string> = {
    "default-src": "'self'",
    "connect-src": buildConnectSrc(network),
    "img-src": "'self' data: blob: https:",
    "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src": "'self' 'unsafe-inline'",
    "font-src": "'self' data:",
    "frame-ancestors": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v}`).join('; ');
}
