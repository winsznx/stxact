'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';
import { useDispute, useSubmitRefundAuthorization, useUpdateDispute } from '@/hooks/useDisputes';
import { useWallet } from '@/hooks/useWallet';
import { signWithWallet } from '@/lib/signing';

export default function DisputeDetailPage() {
  const params = useParams();
  const disputeId = params.id as string;
  const { data: dispute, isLoading, error } = useDispute(disputeId);
  const { address: walletAddress } = useWallet();
  const updateDispute = useUpdateDispute();
  const submitRefund = useSubmitRefundAuthorization();

  const [refundAmountMicro, setRefundAmountMicro] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const canAct = useMemo(() => {
    if (!dispute || !walletAddress) return false;
    return (
      dispute.seller_principal === walletAddress &&
      (dispute.status === 'open' || dispute.status === 'acknowledged')
    );
  }, [dispute, walletAddress]);

  const handleAcknowledge = async () => {
    if (!dispute) return;
    setActionError(null);
    try {
      await updateDispute.mutateAsync({
        id: dispute.dispute_id,
        data: { status: 'acknowledged', resolution_notes: 'Acknowledged by seller' },
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to acknowledge dispute');
    }
  };

  const handleRefund = async () => {
    if (!dispute || !dispute.buyer_principal || !dispute.seller_principal) return;
    setActionError(null);

    try {
      const refundAmount = refundAmountMicro.trim();
      if (!/^[0-9]+$/.test(refundAmount) || refundAmount === '0') {
        throw new Error('Refund amount must be a positive integer (microSTX)');
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const canonical = [
        'STXACT-REFUND',
        dispute.dispute_id,
        dispute.receipt_id,
        refundAmount,
        dispute.buyer_principal,
        dispute.seller_principal,
        timestamp.toString(),
      ].join(':');
      const sellerSignature = await signWithWallet(canonical);

      await submitRefund.mutateAsync({
        dispute_id: dispute.dispute_id,
        receipt_id: dispute.receipt_id,
        refund_amount: refundAmount,
        buyer_principal: dispute.buyer_principal,
        timestamp,
        seller_signature: sellerSignature,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to execute refund');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="glass animate-pulse h-96 rounded-none" />
        </div>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <EmptyState
            icon={AlertTriangle}
            title="Dispute Not Found"
            description="This dispute could not be loaded."
            action={
              <Link
                href="/disputes"
                className="inline-flex items-center gap-2 rounded-none border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Disputes
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const chain = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  const resolutionWindowSeconds = Number(process.env.NEXT_PUBLIC_RESOLUTION_WINDOW_SECONDS || 604800);
  const isExpired =
    (dispute.status === 'open' || dispute.status === 'acknowledged') &&
    Math.floor(Date.now() / 1000) - dispute.created_at > resolutionWindowSeconds;

  const timelineSteps = [
    {
      label: 'Created',
      complete: true,
      time: new Date(dispute.created_at * 1000).toLocaleString(),
    },
    {
      label: 'Acknowledged',
      complete: ['acknowledged', 'resolved', 'refunded'].includes(dispute.status),
      time: dispute.status === 'acknowledged' ? 'Seller acknowledged' : undefined,
    },
    {
      label: 'Resolved',
      complete: ['resolved', 'refunded'].includes(dispute.status),
      time: dispute.resolved_at ? new Date(dispute.resolved_at * 1000).toLocaleString() : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/disputes"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Disputes
        </Link>

        <GlassPanel className="mb-6">
          <h1 className="font-serif text-3xl font-bold">Dispute {dispute.dispute_id.slice(0, 12)}...</h1>
          <p className="mt-1 text-foreground-muted">Status: {dispute.status}</p>
        </GlassPanel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <GlassPanel>
              <h2 className="mb-4 font-serif text-lg font-semibold">Dispute Timeline</h2>
              <div className="space-y-3">
                {timelineSteps.map((step) => (
                  <div key={step.label} className="flex items-start gap-3 rounded-none border border bg-background p-3">
                    {step.complete ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 text-foreground-subtle" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{step.label}</p>
                      {step.time && <p className="text-xs text-foreground-muted">{step.time}</p>}
                    </div>
                  </div>
                ))}
                {isExpired && (
                  <div className="rounded-none border border-warning bg-warning/10 p-3 text-xs text-warning">
                    Resolution window expired for open/acknowledged status.
                  </div>
                )}
              </div>
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-4 font-serif text-lg font-semibold">Details</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-foreground-subtle">Receipt ID</dt>
                  <dd>
                    <Link href={`/receipts/${dispute.receipt_id}`} className="font-mono text-accent hover:underline">
                      {dispute.receipt_id}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Reason</dt>
                  <dd>{dispute.reason}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Buyer Principal</dt>
                  <dd className="font-mono text-xs">{dispute.buyer_principal || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Seller Principal</dt>
                  <dd className="font-mono text-xs">{dispute.seller_principal || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Created At</dt>
                  <dd>{new Date(dispute.created_at * 1000).toLocaleString()}</dd>
                </div>
                {dispute.resolved_at && (
                  <div>
                    <dt className="text-foreground-subtle">Resolved At</dt>
                    <dd>{new Date(dispute.resolved_at * 1000).toLocaleString()}</dd>
                  </div>
                )}
                {dispute.refund_txid && (
                  <div>
                    <dt className="text-foreground-subtle">Refund TX</dt>
                    <dd>
                      <a
                        href={`https://explorer.hiro.so/txid/${dispute.refund_txid}?chain=${chain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-accent hover:underline"
                      >
                        {dispute.refund_txid}
                        <ExternalLink className="ml-1 inline h-3 w-3" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </GlassPanel>
          </div>

          <div className="space-y-6">
            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Seller Actions</h3>
              {!canAct ? (
                <p className="text-sm text-foreground-muted">
                  Actions are available only to the dispute seller while status is open/acknowledged.
                </p>
              ) : (
                <div className="space-y-3">
                  {dispute.status === 'open' && (
                    <button
                      onClick={handleAcknowledge}
                      disabled={updateDispute.isPending}
                      className="w-full rounded-none border border bg-background px-4 py-2 text-sm font-medium hover:bg-background-raised disabled:opacity-50"
                    >
                      {updateDispute.isPending ? 'Updating...' : 'Acknowledge'}
                    </button>
                  )}

                  <div className="space-y-2 border-t border pt-3">
                    <label className="block text-xs font-medium text-foreground-subtle">
                      Refund Amount (microSTX)
                    </label>
                    <input
                      value={refundAmountMicro}
                      onChange={(e) => setRefundAmountMicro(e.target.value)}
                      className="w-full rounded-none border border bg-background px-3 py-2 font-mono text-sm"
                      placeholder="1000000"
                    />
                    <button
                      onClick={handleRefund}
                      disabled={submitRefund.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-none border border-success bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {submitRefund.isPending ? 'Submitting...' : 'Sign & Execute Refund'}
                    </button>
                  </div>
                </div>
              )}

              {actionError && <p className="mt-3 text-sm text-error">{actionError}</p>}
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
