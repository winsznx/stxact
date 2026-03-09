export interface ConnectedStacksAccount {
  address: string;
  publicKey: string;
}

export interface SignedPaymentTransaction {
  signedTransaction: string;
  txId: string;
  explorerUrl: string;
}

function getStacksNetwork() {
  return process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
}

function getAppDetails() {
  return {
    name: 'stxact',
    icon: typeof window !== 'undefined' ? `${window.location.origin}/icon` : '/icon',
  };
}

export function getTransactionExplorerUrl(txId: string): string {
  const chain = getStacksNetwork();
  return `https://explorer.hiro.so/txid/${normalizeTxId(txId)}?chain=${chain}`;
}

export function normalizeTxId(txId: string): string {
  return txId.startsWith('0x') ? txId : `0x${txId}`;
}

function isStacksAddressRecord(
  candidate: unknown
): candidate is {
  address: string;
  publicKey: string;
} {
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as { address?: unknown }).address === 'string' &&
    typeof (candidate as { publicKey?: unknown }).publicKey === 'string' &&
    (candidate as { address: string }).address.toUpperCase().startsWith('S')
  );
}

export async function getConnectedStacksAccount(
  expectedAddress?: string | null
): Promise<ConnectedStacksAccount> {
  const { request } = await import('@stacks/connect');
  const result = (await request('getAddresses')) as {
    addresses?: unknown[];
  };

  const accounts = Array.isArray(result.addresses)
    ? result.addresses.filter(isStacksAddressRecord)
    : [];

  if (!accounts.length) {
    throw new Error('Wallet did not return a connected STX account with a public key');
  }

  const normalizedExpected = expectedAddress?.toUpperCase();
  const account =
    (normalizedExpected
      ? accounts.find((candidate) => candidate.address.toUpperCase() === normalizedExpected)
      : undefined) || accounts[0];

  if (normalizedExpected && account.address.toUpperCase() !== normalizedExpected) {
    throw new Error(
      `Wallet returned ${account.address}, but the current buyer flow is connected as ${expectedAddress}`
    );
  }

  return {
    address: account.address,
    publicKey: account.publicKey,
  };
}

export async function signX402PaymentWithWallet(options: {
  recipient: string;
  amountMicroStx: string;
  memo?: string;
  stxAddress?: string | null;
}): Promise<SignedPaymentTransaction> {
  const { bytesToHex } = await import('@stacks/common');
  const { openSignTransaction } = await import('@stacks/connect');
  const { makeUnsignedSTXTokenTransfer } = await import('@stacks/transactions');

  const account = await getConnectedStacksAccount(options.stxAddress);
  const unsignedTransaction = await makeUnsignedSTXTokenTransfer({
    recipient: options.recipient,
    amount: BigInt(options.amountMicroStx),
    memo: options.memo ?? '',
    publicKey: account.publicKey,
    network: getStacksNetwork(),
  });

  const txHex = unsignedTransaction.serialize();

  return new Promise((resolve, reject) => {
    openSignTransaction({
      txHex,
      network: getStacksNetwork(),
      appDetails: getAppDetails(),
      onFinish: (data) => {
        const transaction = data.stacksTransaction as {
          serialize: () => string | Uint8Array;
          txid: () => string;
        };
        const serialized = transaction.serialize();
        const signedTransaction =
          typeof serialized === 'string' ? serialized : bytesToHex(serialized);
        const txId = normalizeTxId(transaction.txid());

        resolve({
          signedTransaction,
          txId,
          explorerUrl: getTransactionExplorerUrl(txId),
        });
      },
      onCancel: () => reject(new Error('Wallet payment signing cancelled')),
    });
  });
}
