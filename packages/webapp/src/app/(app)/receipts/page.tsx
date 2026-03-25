'use client';

import { useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { FileCheck, Download, AlertCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import type { Receipt } from '@/lib/api';

/**
 * Executes logic associated with receipts page.
 */
export default function ReceiptsPage() {
  const { address: walletAddress } = useWallet();
  const [filter, setFilter] = useState<'all' | 'seller' | 'buyer'>('all');

  const { data, isLoading, error } = useReceipts({
    seller_principal: filter === 'seller' ? walletAddress || undefined : undefined,
    buyer_principal: filter === 'buyer' ? walletAddress || undefined : undefined,
    limit: 50,
  });

  const stats = {
    total: data?.receipts.length || 0,
    verified: data?.receipts.filter((r) => r.revision === 1).length || 0,
    pending: data?.receipts.filter((r) => r.revision === 0).length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header - Ledger Style */}
        <div className="mb-8 border-b border pb-6">
          <h1 className="mb-2 font-serif text-3xl font-bold">
            Your Receipts
          </h1>
          <p className="text-foreground-muted">
            Cryptographic payment records and delivery proofs
          </p>
        </div>

        {/* Stats Cards - Receipt Paper Style */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Total Receipts"
            value={stats.total}
            icon={<FileCheck className="h-5 w-5" />}
            color="accent"
          />
          <StatCard
            title="Verified"
            value={stats.verified}
            icon={<FileCheck className="h-5 w-5" />}
            color="success"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<AlertCircle className="h-5 w-5" />}
            color="warning"
          />
        </div>

        {/* Filters - Ledger Style */}
        <div className="mb-6 rounded-none border border bg-background-raised p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-none px-4 py-2 text-sm font-medium transition-colors ${filter === 'all'
                    ? 'border-2 border-foreground bg-accent text-accent-contrast'
                    : 'border border hover:border-accent'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('seller')}
                className={`rounded-none px-4 py-2 text-sm font-medium transition-colors ${filter === 'seller'
                    ? 'border-2 border-foreground bg-accent text-accent-contrast'
                    : 'border border hover:border-accent'
                  }`}
              >
                As Seller
              </button>
              <button
                onClick={() => setFilter('buyer')}
                className={`rounded-none px-4 py-2 text-sm font-medium transition-colors ${filter === 'buyer'
                    ? 'border-2 border-foreground bg-accent text-accent-contrast'
                    : 'border border hover:border-accent'
                  }`}
              >
                As Buyer
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/receipts/verify"
                className="inline-flex items-center gap-2 rounded-none border border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:bg-background-overlay"
              >
                Verify JSON
              </Link>
              <button
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
                  const params = new URLSearchParams();
                  if (filter === 'seller' && walletAddress) params.set('seller_principal', walletAddress);
                  if (filter === 'buyer' && walletAddress) params.set('buyer_principal', walletAddress);
                  window.open(`${apiUrl}/receipts?${params}`, '_blank');
                }}
                className="inline-flex items-center gap-2 rounded-none border border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:bg-background-overlay"
              >
                <Download className="h-4 w-4" />
                Export All
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-none border border bg-background-raised p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-2 h-5 w-1/3 bg-background-overlay" />
                    <div className="h-4 w-1/2 bg-background-overlay" />
                  </div>
                  <div className="h-8 w-24 bg-background-overlay" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-none border border-error bg-background-raised p-4 text-error">
            Failed to load receipts. Please try again.
          </div>
        )}

        {/* Receipts List */}
        {data?.receipts && data.receipts.length > 0 ? (
          <div className="space-y-4">
            {data.receipts.map((receipt, index) => (
              <div
                key={receipt.receipt_id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ReceiptRow receipt={receipt} />
              </div>
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="rounded-none border border bg-background-raised py-12 text-center">
              <FileCheck className="mx-auto mb-4 h-12 w-12 text-foreground-subtle" />
              <h3 className="mb-2 font-serif text-lg font-semibold">
                No receipts found
              </h3>
              <p className="text-foreground-muted">
                Your receipts will appear here after making payments
              </p>
            </div>
          )
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
  color: 'accent' | 'success' | 'warning';
}) {
  const colorClasses = {
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
  };

  return (
    <div className="rounded-none border border bg-background-raised p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground-muted">
          {title}
        </span>
        <div className={`rounded-none border border bg-background p-2 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="font-mono text-3xl font-bold">
        {value}
      </div>
    </div>
  );
}

function ReceiptRow({ receipt }: { receipt: Receipt }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-none border border bg-background-raised transition-colors hover:border-accent">
      <div
        className="cursor-pointer p-6 transition-colors hover:bg-background-overlay"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <code className="font-mono text-sm">
                {receipt.receipt_id.slice(0, 16)}...
              </code>
              <span
                className={`inline-flex items-center rounded-none border border px-2 py-1 text-xs font-medium ${receipt.revision === 1
                    ? 'bg-background text-success'
                    : 'bg-background text-warning'
                  }`}
              >
                {receipt.revision === 1 ? 'Verified' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono text-sm text-foreground-muted">
              <span>Block: {receipt.block_height}</span>
              <span>-</span>
              <span>{new Date(receipt.timestamp * 1000).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/receipts/${receipt.receipt_id}`}
              className="rounded-none border border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:bg-background-overlay"
              onClick={(e) => e.stopPropagation()}
            >
              View Details
            </Link>
            <ChevronDown
              className={`h-5 w-5 text-foreground-subtle transition-transform ${expanded ? 'rotate-180' : ''
                }`}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border px-6 pb-6 pt-4">
          <dl className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div className="border-b border pb-2">
              <dt className="mb-1 text-foreground-muted">
                Payment TX
              </dt>
              <dd>
                {receipt.payment_txid.slice(0, 16)}...
              </dd>
            </div>
            <div className="border-b border pb-2">
              <dt className="mb-1 text-foreground-muted">
                Seller
              </dt>
              <dd>
                {receipt.seller_principal.slice(0, 16)}...
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
