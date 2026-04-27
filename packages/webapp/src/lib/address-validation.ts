import { z } from 'zod';
import { isAddressOnNetwork } from '@/lib/stacks';
import { getNetwork, type StacksNetwork } from '@/lib/network';

export class AddressNetworkMismatch extends Error {
  constructor(address: string, expected: StacksNetwork) {
    super(`Address ${address} does not match the active network (${expected})`);
    this.name = 'AddressNetworkMismatch';
  }
}

export function validateAddressForActiveNetwork(address: string): void {
  const network = getNetwork();
  if (!isAddressOnNetwork(address, network)) {
    throw new AddressNetworkMismatch(address, network);
  }
}

export const stacksAddressForCurrentNetwork = z.string().superRefine((address, ctx) => {
  const network = getNetwork();
  if (!isAddressOnNetwork(address, network)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Address must be a valid ${network} address`,
    });
  }
});
