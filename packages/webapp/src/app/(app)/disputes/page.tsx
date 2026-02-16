'use client';

import { AlertCircle, Scale, CheckCircle2, RefreshCw, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useDisputes } from '@/hooks/useDisputes';
import { useWallet } from '@/hooks/useWallet';
import { useState, useEffect } from 'react';

export default function DisputesPage() {
  const { address: walletAddress } = useWallet();

  const { data, isLoading } = useDisputes({
    buyer_principal: walletAddress || undefined,
    limit: 50,
  });

  const disputes = data?.disputes || [];

  const stats = {
    open: disputes.filter((d) => d.status === 'open').length || 0,
    acknowledged: disputes.filter((d) => d.status === 'acknowledged').length || 0,
    resolved: disputes.filter((d) => d.status === 'resolved').length || 0,
    refunded: disputes.filter((d) => d.status === 'refunded').length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header - Ledger Style */}
        <div className="mb-8 flex items-center justify-between border-b border pb-6">
          <div>
            <h1 className="mb-2 font-serif text-3xl font-bold">
              Dispute Management
            </h1>
            <p className="text-foreground-muted">
              On-chain arbitration and refund rails
            </p>
          </div>

          <Link
            href="/disputes/new"
            className="rounded-none border-2 border-foreground bg-error px-6 py-3 font-semibold text-background transition-colors hover:bg-error/90"
          >
            File Dispute
          </Link>
        </div>

        {/* Stats - Receipt Paper Style */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
          <StatCard title="Open" value={stats.open} icon={<AlertCircle className="h-5 w-5" />} color="error" />
          <StatCard title="Acknowledged" value={stats.acknowledged} icon={<RefreshCw className="h-5 w-5" />} color="warning" />
          <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-5 w-5" />} color="success" />
          <StatCard title="Refunded" value={stats.refunded} icon={<RefreshCcw className="h-5 w-5" />} color="accent" />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-none border border bg-background-raised py-16">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin border-2 border-t-accent" />
              <p className="text-foreground-muted">Loading disputes...</p>
            </div>
          </div>
        )}

        {/* Disputes List */}
        {!isLoading && disputes.length > 0 && (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <Link
                key={dispute.dispute_id}
                href={`/disputes/${dispute.dispute_id}`}
                className="block rounded-none border border bg-background-raised p-6 transition-colors hover:border-accent hover:bg-background-overlay"
              >
                <div className="mb-2 flex items-center justify-between">
                  <code className="font-mono text-sm">
                    {dispute.dispute_id.slice(0, 16)}...
                  </code>
                  <span
                    className={`inline-flex items-center rounded-none border border px-2 py-1 text-xs font-medium ${dispute.status === 'open'
                        ? 'bg-background text-error'
                        : dispute.status === 'acknowledged'
                          ? 'bg-background text-warning'
                          : dispute.status === 'resolved'
                            ? 'bg-background text-success'
                            : 'bg-background text-accent'
                      }`}
                  >
                    {dispute.status}
                  </span>
                </div>
                <p className="mb-2 text-sm text-foreground-muted">{dispute.reason}</p>
                <div className="font-mono text-xs text-foreground-subtle">
                  {new Date(dispute.created_at * 1000).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && disputes.length === 0 && (
          <div className="rounded-none border border bg-background-raised py-16">
            <div className="text-center">
              <Scale className="mx-auto mb-4 h-16 w-16 text-foreground-subtle" />
              <h3 className="mb-2 font-serif text-xl font-semibold">
                No disputes filed
              </h3>
              <p className="mb-6 text-foreground-muted">
                Disputes will appear here when you file them
              </p>
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
        <span className="text-sm font-medium text-foreground-muted">
          {title}
        </span>
        <div className={`rounded-none border border bg-background p-2 ${colorClasses[colorClasses[color] ? color : 'accent']}`}>
          {icon}
        </div>
      </div>
      <div className="font-mono text-3xl font-bold">
        {value}
      </div>
    </div>
  );
}
