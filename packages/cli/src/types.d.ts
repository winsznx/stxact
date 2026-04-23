declare module 'cli-table3' {
  export default class Table {
    constructor(options?: Record<string, unknown>);
    push(...rows: unknown[]): number;
    toString(): string;
  }
}

declare module 'x402-stacks' {
  import type { AxiosInstance } from 'axios';

  export function privateKeyToAccount(
    privateKey: string,
    network: 'mainnet' | 'testnet'
  ): unknown;

  export function wrapAxiosWithPayment(
    client: AxiosInstance,
    account: unknown,
    config?: Record<string, unknown>
  ): AxiosInstance;
}


/**
 * DeepReadonly type recursively makes all properties immutable.
 * Applied to prevent accidental mutations in CLI args.
 */
export type DeepReadonly<T> = T extends Function ? T : T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } : T;
