import { getNetworkId } from './network';

export function withNetworkContext<T extends object>(payload: T): T & { network: string } {
  return { ...payload, network: getNetworkId() };
}
