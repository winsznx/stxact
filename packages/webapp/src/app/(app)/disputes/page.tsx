'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Scale, CheckCircle2, RefreshCw, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useDisputes } from '@/hooks/useDisputes';
import { useWallet } from '@/hooks/useWallet';

type ViewMode = 'buyer' | 'seller';
type StatusFilter = 'all' | 'open' | 'resolved' | 'expired';

export default function DisputesPage() {
  const { address: walletAddress } = useWallet();
  const [viewMode, setViewMode] = useState<ViewMode>('buyer');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const resolutionWindowSeconds = Number(process.env.NEXT_PUBLIC_RESOLUTION_WINDOW_SECONDS || 604800);

  const { data, isLoading } = useDisputes({
    buyer_principal: viewMode === 'buyer' ? walletAddress || undefined : undefined,
    seller_principal: viewMode === 'seller' ? walletAddress || undefined : undefined,
    limit: 100,
  });

  const disputes = data?.disputes || [];
  const now = Math.floor(Date.now() / 1000);

  const withDerivedStatus = useMemo(
    () =>
      disputes.map((dispute) => {
        const expired =
          (dispute.status === 'open' || dispute.status === 'acknowledged') &&
          now - dispute.created_at > resolutionWindowSeconds;
        const derivedStatus = expired ? 'expired' : dispute.status;
        return {
          ...dispute,
          derivedStatus,
        };
      }),
    [disputes, now, resolutionWindowSeconds]
  );

  const filteredDisputes = useMemo(
    () =>
      withDerivedStatus.filter((dispute) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'open') {
          return dispute.derivedStatus === 'open' || dispute.derivedStatus === 'acknowledged';
        }
        if (statusFilter === 'resolved') {
          return dispute.derivedStatus === 'resolved' || dispute.derivedStatus === 'refunded';
        }
        return dispute.derivedStatus === 'expired';
      }),
    [statusFilter, withDerivedStatus]
  );

  const stats = {
    open: withDerivedStatus.filter((d) => d.derivedStatus === 'open' || d.derivedStatus === 'acknowledged').length,
    resolved: withDerivedStatus.filter((d) => d.derivedStatus === 'resolved').length,
    refunded: withDerivedStatus.filter((d) => d.derivedStatus === 'refunded').length,
    expired: withDerivedStatus.filter((d) => d.derivedStatus === 'expired').length,
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-none border border bg-background-raised p-10 text-center">
            <Scale className="mx-auto mb-4 h-12 w-12 text-foreground-subtle" />
            <h1 className="mb-2 font-serif text-3xl font-bold">Dispute Management</h1>
            <p className="text-foreground-muted">
              Connect a wallet to load your buyer and seller dispute views.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border pb-6">
          <div>
            <h1 className="mb-2 font-serif text-3xl font-bold">Dispute Management</h1>
            <p className="text-foreground-muted">Buyer and seller workflows for deterministic dispute resolution</p>
          </div>

          <Link
            href="/disputes/new"
            className="rounded-none border-2 border-foreground bg-error px-6 py-3 font-semibold text-background transition-colors hover:bg-error/90"
          >
            File Dispute
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('buyer')}
            className={`rounded-none border px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'buyer'
                ? 'border-accent bg-background-raised text-foreground'
                : 'border hover:border-accent hover:bg-background-overlay'
            }`}
          >
            Buyer View
          </button>
          <button
            onClick={() => setViewMode('seller')}
            className={`rounded-none border px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'seller'
                ? 'border-accent bg-background-raised text-foreground'
                : 'border hover:border-accent hover:bg-background-overlay'
            }`}
          >
            Seller View
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
          <StatCard title="Open" value={stats.open} icon={<AlertCircle className="h-5 w-5" />} color="error" />
          <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-5 w-5" />} color="success" />
          <StatCard title="Refunded" value={stats.refunded} icon={<RefreshCcw className="h-5 w-5" />} color="accent" />
          <StatCard title="Expired" value={stats.expired} icon={<RefreshCw className="h-5 w-5" />} color="warning" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <StatusChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          <StatusChip label="Open" active={statusFilter === 'open'} onClick={() => setStatusFilter('open')} />
          <StatusChip
            label="Resolved"
            active={statusFilter === 'resolved'}
            onClick={() => setStatusFilter('resolved')}
          />
          <StatusChip
            label="Expired"
            active={statusFilter === 'expired'}
            onClick={() => setStatusFilter('expired')}
          />
        </div>

        {isLoading && (
          <div className="rounded-none border border bg-background-raised py-16">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin border-2 border-t-accent" />
              <p className="text-foreground-muted">Loading disputes...</p>
            </div>
          </div>
        )}

        {!isLoading && filteredDisputes.length > 0 && (
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => {
              const statusClass =
                dispute.derivedStatus === 'expired'
                  ? 'text-warning'
                  : dispute.derivedStatus === 'open'
                    ? 'text-error'
                    : dispute.derivedStatus === 'acknowledged'
                      ? 'text-warning'
                      : dispute.derivedStatus === 'resolved'
                        ? 'text-success'
                        : 'text-accent';

              return (
                <Link
                  key={dispute.dispute_id}
                  href={`/disputes/${dispute.dispute_id}`}
                  className="block"
                >
                  <article className="rounded-none border border bg-background-raised p-6 transition-colors hover:border-accent hover:bg-background-overlay">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <code className="font-mono text-sm">{dispute.dispute_id.slice(0, 16)}...</code>
                      <span className={`inline-flex items-center rounded-none border border px-2 py-1 text-xs font-medium ${statusClass}`}>
                        {dispute.derivedStatus}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-foreground-muted">{dispute.reason}</p>
                    <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-foreground-subtle">
                      <span>{new Date(dispute.created_at * 1000).toLocaleDateString()}</span>
                      <span>{viewMode === 'buyer' ? 'Buyer' : 'Seller'} workflow</span>
                      <span>
                        Refund:{' '}
                        {dispute.refund_amount
                          ? `${(Number(dispute.refund_amount) / 1_000_000).toFixed(6)} STX`
                          : 'none'}
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        {!isLoading && filteredDisputes.length === 0 && (
          <div className="rounded-none border border bg-background-raised py-16">
            <div className="text-center">
              <Scale className="mx-auto mb-4 h-16 w-16 text-foreground-subtle" />
              <h3 className="mb-2 font-serif text-xl font-semibold">No disputes found</h3>
              <p className="mb-6 text-foreground-muted">No disputes match the selected view and status filters.</p>
              <Link
                href="/disputes/new"
                className="inline-flex items-center rounded-none border-2 border-foreground bg-error px-6 py-3 font-semibold text-background transition-colors hover:bg-error/90"
              >
                File Your First Dispute
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-none border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-accent bg-background-raised text-foreground'
          : 'border hover:border-accent hover:bg-background-overlay'
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'accent' | 'success' | 'warning' | 'error';
}) {
  const colorClasses = {
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };

  return (
    <div className="rounded-none border border bg-background-raised p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground-muted">{title}</span>
        <div className={`rounded-none border border bg-background p-2 ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className="font-mono text-3xl font-bold">{value}</div>
    </div>
  );
}
