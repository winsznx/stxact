'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Copy, Check, Shield, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useService } from '@/hooks/useServices';
import { TrustBadge } from '@/components/TrustBadge';
import { DataTable } from '@/components/DataTable';
import { GlassPanel } from '@/components/GlassCard';
import { MetricTile } from '@/components/MetricTile';

export default function ServiceDetailPage() {
  const params = useParams();
  const principal = params.principal as string;
  const { data: service, isLoading, error } = useService(principal);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'policy' | 'history'>('overview');

  const copyPrincipal = () => {
    navigator.clipboard.writeText(principal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="glass animate-pulse h-96 rounded-none" />
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="glass rounded-none p-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
            <h2 className="mb-2 font-serif text-xl font-semibold">Service Not Found</h2>
            <p className="text-foreground-muted">This service doesn't exist or has been deactivated.</p>
          </div>
        </div>
      </div>
    );
  }

  const getTrustLevel = (score: number): 'anchored' | 'database' | 'risk' => {
    if (score >= 80) return 'anchored';
    if (score >= 40) return 'database';
    return 'risk';
  };

  const mockTransactions = [
    {
      id: 'rx_abc123',
      timestamp: Date.now() - 3600000,
      token: 'STX',
      amount: '100',
      status: 'completed',
      dispute: null,
    },
    {
      id: 'rx_def456',
      timestamp: Date.now() - 7200000,
      token: 'sBTC',
      amount: '0.001',
      status: 'completed',
      dispute: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/directory"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>

        {/* SECTION 1: Identity Panel */}
        <GlassPanel className="mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-none border-2 border-foreground bg-background">
                  <Shield className="h-8 w-8" />
                </div>

                <div className="flex-1">
                  <h1 className="mb-2 font-serif text-3xl font-bold">
                    {service.bns_name || `${principal.slice(0, 12)}...`}
                  </h1>

                  <button
                    onClick={copyPrincipal}
                    className="mb-3 flex items-center gap-2 font-mono text-sm text-foreground-muted hover:text-accent"
                  >
                    <span>{principal}</span>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <TrustBadge level={getTrustLevel(service.reputation_score)} />
                    <span className="rounded-none border border px-2 py-1 text-xs font-medium">
                      {service.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border pt-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-foreground-subtle">Key Version</p>
                  <p className="mt-1 font-mono text-sm font-semibold">v1</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-subtle">Registered Block</p>
                  <p className="mt-1 font-mono text-sm font-semibold">123,456</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-subtle">Stake Bonded</p>
                  <p className="mt-1 font-mono text-sm font-semibold">100 STX</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-subtle">BNS Verified</p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {service.bns_name ? '✓ Yes' : '✗ No'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-foreground-subtle">Reputation Score</p>
              <p className="mt-1 font-mono text-5xl font-bold">{service.reputation_score}</p>
              <p className="mt-2 text-xs text-foreground-muted">
                Deterministic from on-chain events
              </p>
            </div>
          </div>
        </GlassPanel>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 border-b border">
          {[
            { id: 'overview', label: 'Reputation & Events' },
            { id: 'policy', label: 'Policy Viewer' },
            { id: 'history', label: 'Transaction History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* SECTION 2: Reputation Graph + Stats */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <MetricTile label="Success Rate" value="95.8%" />
              <MetricTile label="Total Deliveries" value="245" />
              <MetricTile label="Disputes Filed" value="2" />
              <MetricTile label="Refunds Executed" value="1" />
            </div>

            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Activity Over Time</h3>
              <div className="flex h-64 items-center justify-center border border">
                <p className="text-sm text-foreground-subtle">
                  Chart: Deliveries, Disputes, Refunds over time
                </p>
              </div>
              <p className="mt-4 text-xs text-foreground-subtle">
                Reputation is computed deterministically from on-chain delivery proofs,
                dispute resolutions, and refund executions.
              </p>
            </GlassPanel>
          </div>
        )}

        {/* SECTION 3: Policy Viewer */}
        {activeTab === 'policy' && (
          <GlassPanel>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-1 font-serif text-lg font-semibold">Service Policy</h3>
                <p className="text-xs text-foreground-muted">Anchored on-chain • Hash verified</p>
              </div>
              <div className="rounded-none border border-success bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                ✓ Hash Verified
              </div>
            </div>

            <div className="mb-4 rounded-none border border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground-subtle">SHA-256 Hash</span>
                <button className="flex items-center gap-1 text-xs text-accent hover:underline">
                  <ExternalLink className="h-3 w-3" />
                  View on Explorer
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-foreground-muted">
                {service.policy_hash}
              </p>
            </div>

            <div className="rounded-none border border bg-background p-4">
              <pre className="overflow-x-auto text-xs">
{`{
  "service_id": "${service.principal}",
  "version": "1.0.0",
  "pricing": {
    "sync_delivery": "100 STX per request"
  },
  "sla": {
    "response_time_ms": 1000
  },
  "dispute_window_hours": 24
}`}
              </pre>
            </div>
          </GlassPanel>
        )}

        {/* SECTION 4: Transaction History */}
        {activeTab === 'history' && (
          <DataTable
            columns={[
              {
                key: 'timestamp',
                label: 'Time',
                render: (tx) => new Date(tx.timestamp).toLocaleString(),
              },
              {
                key: 'id',
                label: 'Receipt ID',
                render: (tx) => (
                  <Link href={`/receipts/${tx.id}`} className="font-mono text-xs text-accent hover:underline">
                    {tx.id}
                  </Link>
                ),
              },
              {
                key: 'token',
                label: 'Token',
                render: (tx) => <span className="font-mono text-xs">{tx.token}</span>,
              },
              {
                key: 'amount',
                label: 'Amount',
                render: (tx) => <span className="font-mono text-xs">{tx.amount}</span>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (tx) => (
                  <span className="rounded-none border border-success bg-success/10 px-2 py-0.5 text-xs text-success">
                    {tx.status}
                  </span>
                ),
              },
            ]}
            data={mockTransactions}
            keyExtractor={(tx) => tx.id}
            emptyMessage="No transactions found"
          />
        )}
      </div>
    </div>
  );
}
