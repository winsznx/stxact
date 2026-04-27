export interface TokenContract {
  readonly address: string;
  readonly name: string;
}

export interface ContractRef {
  readonly address: string;
  readonly name: string;
  readonly fullId: string;
}

export function formatContractId(c: TokenContract | ContractRef): string {
  if ('fullId' in c) return c.fullId;
  return `${c.address}.${c.name}`;
}
