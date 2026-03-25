'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useCreateDispute } from '@/hooks/useDisputes';
import { GlassPanel } from '@/components/GlassCard';
import { useWallet } from '@/hooks/useWallet';
import { signWithWallet } from '@/lib/signing';

type DisputeReason =
  | 'delivery_hash_mismatch'
  | 'no_response'
  | 'incomplete_delivery'
  | 'fraudulent_quote';

/**
 * Executes logic associated with new dispute page.
 */
export default function NewDisputePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createDispute = useCreateDispute();
  const { address: walletAddress } = useWallet();

  const [receiptId, setReceiptId] = useState(searchParams.get('receipt_id') || '');
  const [reason, setReason] = useState<DisputeReason>('delivery_hash_mismatch');
  const [expectedHash, setExpectedHash] = useState('');
  const [receivedHash, setReceivedHash] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signWithWalletEnabled, setSignWithWalletEnabled] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const evidence: Record<string, unknown> = { notes };
      let buyerSignature: string | undefined;
      let timestamp: number | undefined;

      if (reason === 'delivery_hash_mismatch') {
        evidence.expected_hash = expectedHash;
        evidence.received_hash = receivedHash;
      }

      if (signWithWalletEnabled && walletAddress) {
        timestamp = Math.floor(Date.now() / 1000);
        const canonical = ['STXACT-DISPUTE', receiptId, reason, timestamp.toString()].join(':');
        buyerSignature = await signWithWallet(canonical);
      }

      await createDispute.mutateAsync({
        receipt_id: receiptId,
        reason,
        evidence,
        buyer_signature: buyerSignature,
        timestamp,
      });

      router.push('/disputes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dispute');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/disputes"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Disputes
        </Link>

        <div className="mb-10 border-b border pb-6">
          <h1 className="mb-3 font-serif text-4xl font-bold">
            File a Dispute
          </h1>
          <p className="text-lg text-foreground-muted">
            Submit a dispute for a receipt with delivery issues
          </p>
        </div>

        <GlassPanel>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 rounded-none border border-error bg-background-raised p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-error" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="receiptId" className="mb-2 block text-sm font-medium">
                Receipt ID <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="receiptId"
                value={receiptId}
                onChange={(e) => setReceiptId(e.target.value)}
                required
                placeholder="Enter the receipt ID"
                className="w-full rounded-none border border bg-background px-4 py-2 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                The unique identifier from your receipt
              </p>
            </div>

            <div>
              <label htmlFor="reason" className="mb-2 block text-sm font-medium">
                Dispute Reason <span className="text-error">*</span>
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as DisputeReason)}
                required
                className="w-full rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="delivery_hash_mismatch">Delivery Hash Mismatch</option>
                <option value="no_response">No Response from Seller</option>
                <option value="incomplete_delivery">Incomplete Delivery</option>
                <option value="fraudulent_quote">Fraudulent Quote</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={signWithWalletEnabled}
                onChange={(e) => setSignWithWalletEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              Sign dispute with connected wallet
            </label>

            {reason === 'delivery_hash_mismatch' && (
              <>
                <div>
                  <label htmlFor="expectedHash" className="mb-2 block text-sm font-medium">
                    Expected Hash
                  </label>
                  <input
                    type="text"
                    id="expectedHash"
                    value={expectedHash}
                    onChange={(e) => setExpectedHash(e.target.value)}
                    placeholder="The hash you expected to receive"
                    className="w-full rounded-none border border bg-background px-4 py-2 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label htmlFor="receivedHash" className="mb-2 block text-sm font-medium">
                    Received Hash
                  </label>
                  <input
                    type="text"
                    id="receivedHash"
                    value={receivedHash}
                    onChange={(e) => setReceivedHash(e.target.value)}
                    placeholder="The hash you actually received"
                    className="w-full rounded-none border border bg-background px-4 py-2 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="notes" className="mb-2 block text-sm font-medium">
                Additional Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Provide additional context or evidence for your dispute..."
                className="w-full rounded-none border border bg-background px-4 py-2 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex gap-3 border-t border pt-6">
              <button
                type="submit"
                disabled={createDispute.isPending}
                className="flex-1 rounded-none border border bg-accent px-6 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {createDispute.isPending ? 'Submitting...' : 'Submit Dispute'}
              </button>

              <Link
                href="/disputes"
                className="flex-1 rounded-none border border bg-background-overlay px-6 py-3 text-center font-semibold transition-colors hover:bg-background-raised"
              >
                Cancel
              </Link>
            </div>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
}
