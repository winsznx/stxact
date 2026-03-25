'use client';

import { Loader2, Receipt, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { useService } from '@/hooks/useServices';
import { useReceipts } from '@/hooks/useReceipts';
import { useDisputes } from '@/hooks/useDisputes';
import { GlassPanel } from '@/components/GlassCard';
import { MetricTile } from '@/components/MetricTile';

/**
 * Executes logic associated with seller dashboard page.
 */
export default function SellerDashboardPage() {
  const { address: walletAddress } = useWallet();
  const { data: service, isLoading: serviceLoading, error: serviceError } = useService(walletAddress || '');
  const { data: receiptsData, isLoading: receiptsLoading } = useReceipts({
    seller_principal: walletAddress || undefined,
    limit: 100,
  });
  const { data: disputesData, isLoading: disputesLoading } = useDisputes({
    seller_principal: walletAddress || undefined,
    limit: 100,
  });

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <GlassPanel className="p-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
            <h1 className="mb-2 font-serif text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-foreground-muted">Connect your wallet to view seller metrics and dispute actions.</p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (serviceLoading || receiptsLoading || disputesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!service && serviceError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <GlassPanel className="p-12 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-error" />
            <h1 className="mb-2 font-serif text-3xl font-bold">Service Lookup Failed</h1>
            <p className="text-foreground-muted">
              Failed to load service profile for this wallet. Check API connectivity and retry.
            </p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <GlassPanel className="p-12 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-warning" />
            <h1 className="mb-2 font-serif text-3xl font-bold">Service Not Registered</h1>
            <p className="mb-6 text-foreground-muted">
              Register your service first. Registration requires wallet signature and backend verification.
            </p>
            <Link
              href="/register"
              className="inline-flex rounded-none border border-accent bg-accent px-6 py-3 font-semibold text-accent-contrast"
            >
              Go to Registration
            </Link>
          </GlassPanel>
        </div>
      </div>
    );
  }

  const receipts = receiptsData?.receipts || [];
  const disputes = disputesData?.disputes || [];

  const totalReceipts = receipts.length;
  const totalDisputes = disputes.length;
  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'acknowledged').length;
  const refundedDisputes = disputes.filter((d) => d.status === 'refunded').length;
  const successRate =
    totalReceipts > 0 ? Math.max(0, ((totalReceipts - totalDisputes) / totalReceipts) * 100) : 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold">Seller Dashboard</h1>
          <p className="text-foreground-muted">Service-level performance and dispute operations</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Total Receipts" value={totalReceipts.toString()} icon={Receipt} />
          <MetricTile label="Success Rate" value={`${successRate.toFixed(1)}%`} icon={TrendingUp} />
          <MetricTile label="Open Disputes" value={openDisputes.toString()} icon={AlertTriangle} />
          <MetricTile label="Refunded Disputes" value={refundedDisputes.toString()} icon={Shield} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GlassPanel>
            <h2 className="mb-4 font-serif text-lg font-semibold">Service Profile</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-foreground-subtle">Principal</dt>
                <dd className="font-mono text-xs">{service.principal}</dd>
              </div>
              <div>
                <dt className="text-foreground-subtle">Category</dt>
                <dd>{service.category}</dd>
              </div>
              <div>
                <dt className="text-foreground-subtle">Policy Hash</dt>
                <dd className="font-mono text-xs break-all">{service.policy_hash}</dd>
              </div>
            </dl>
          </GlassPanel>

          <GlassPanel>
            <h2 className="mb-4 font-serif text-lg font-semibold">Recent Activity</h2>
            <div className="space-y-3">
              {receipts.slice(0, 5).map((r) => (
                <Link
                  key={r.receipt_id}
                  href={`/receipts/${r.receipt_id}`}
                  className="block rounded-none border border bg-background px-3 py-2 text-xs font-mono hover:bg-background-raised"
                >
                  {r.receipt_id}
                </Link>
              ))}
              {receipts.length === 0 && (
                <p className="text-sm text-foreground-muted">No receipts yet.</p>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
