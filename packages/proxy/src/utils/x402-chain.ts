import { getNetworkId } from '../config/network';

const X402_CHAIN_IDS: Record<'mainnet' | 'testnet', string> = {
  mainnet: 'stacks:1',
  testnet: 'stacks:2147483648',
};

export function getX402ChainId(): string {
  const network = getNetworkId();
  if (network === 'mocknet') return X402_CHAIN_IDS.testnet;
  return X402_CHAIN_IDS[network];
}
