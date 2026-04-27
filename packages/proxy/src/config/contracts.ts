interface ContractRef {
  address: string;
  name: string;
  fullId: string;
}

function fromEnv(envKey: string, required = true): ContractRef | null {
  const raw = process.env[envKey];
  if (!raw) {
    if (required) throw new Error(`${envKey} is required`);
    return null;
  }
  const [address, name] = raw.split('.');
  if (!address || !name) {
    throw new Error(`${envKey} must be formatted as <address>.<contract-name>`);
  }
  return { address, name, fullId: raw };
}

export function getServiceRegistry(): ContractRef {
  return fromEnv('SERVICE_REGISTRY_ADDRESS')!;
}

export function getReputationMap(): ContractRef {
  return fromEnv('REPUTATION_MAP_ADDRESS')!;
}

export function getDisputeResolver(): ContractRef {
  return fromEnv('DISPUTE_RESOLVER_ADDRESS')!;
}

export function getReceiptAnchor(): ContractRef | null {
  return fromEnv('RECEIPT_ANCHOR_ADDRESS', false);
}
