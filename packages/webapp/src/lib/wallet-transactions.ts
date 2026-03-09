export interface BroadcastedPayment {
  txId: string;
  explorerUrl: string;
}

export interface ConfirmedTransaction {
  txId: string;
  blockHeight: number;
  blockHash: string;
  senderAddress: string | null;
  recipientAddress: string | null;
  amountMicroStx: string | null;
}

function getStacksNetwork() {
  return process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
}

function getStacksApiUrl() {
  return process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';
}

export function getTransactionExplorerUrl(txId: string): string {
  const chain = getStacksNetwork();
  return `https://explorer.hiro.so/txid/${normalizeTxId(txId)}?chain=${chain}`;
}

export function normalizeTxId(txId: string): string {
  return txId.startsWith('0x') ? txId : `0x${txId}`;
}

export async function transferStxWithWallet(options: {
  recipient: string;
  amountMicroStx: string;
  memo?: string;
  stxAddress?: string;
}): Promise<BroadcastedPayment> {
  const { openSTXTransfer } = await import('@stacks/connect');

  return new Promise((resolve, reject) => {
    openSTXTransfer({
      recipient: options.recipient,
      amount: options.amountMicroStx,
      memo: options.memo,
      stxAddress: options.stxAddress,
      network: getStacksNetwork(),
      appDetails: {
        name: 'stxact',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/icon` : '/icon',
      },
      onFinish: (data) => {
        if (!data.txId) {
          reject(new Error('Wallet did not return a transaction id'));
          return;
        }

        resolve({
          txId: normalizeTxId(data.txId),
          explorerUrl: getTransactionExplorerUrl(data.txId),
        });
      },
      onCancel: () => reject(new Error('Wallet payment cancelled')),
    });
  });
}

export async function waitForTransactionConfirmation(
  txId: string,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {}
): Promise<ConfirmedTransaction> {
  const timeoutMs = options.timeoutMs ?? 180_000;
  const intervalMs = options.intervalMs ?? 2_500;
  const startedAt = Date.now();
  const normalizedTxId = normalizeTxId(txId);

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${getStacksApiUrl()}/extended/v1/tx/${normalizedTxId}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const txData = (await response.json()) as {
        tx_status?: string;
        block_height?: number;
        block_hash?: string;
        sender_address?: string;
        tx_type?: string;
        token_transfer?: {
          recipient_address?: string;
          amount?: string | number;
        };
      };

      if (txData.tx_status === 'success' && txData.block_height && txData.block_hash) {
        return {
          txId: normalizedTxId,
          blockHeight: Number(txData.block_height),
          blockHash: String(txData.block_hash),
          senderAddress: typeof txData.sender_address === 'string' ? txData.sender_address : null,
          recipientAddress:
            txData.tx_type === 'token_transfer' &&
            typeof txData.token_transfer?.recipient_address === 'string'
              ? txData.token_transfer.recipient_address
              : null,
          amountMicroStx:
            txData.tx_type === 'token_transfer' && txData.token_transfer?.amount !== undefined
              ? String(txData.token_transfer.amount)
              : null,
        };
      }

      if (
        txData.tx_status &&
        txData.tx_status !== 'pending' &&
        txData.tx_status !== 'success' &&
        txData.tx_status !== 'pending_processing'
      ) {
        throw new Error(`Payment transaction failed with status: ${txData.tx_status}`);
      }
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, intervalMs);
    });
  }

  throw new Error('Timed out waiting for on-chain payment confirmation');
}
