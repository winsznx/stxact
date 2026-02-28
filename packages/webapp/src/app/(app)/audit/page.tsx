'use client';

import { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Shield,
  Filter,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useReceipts } from '@/hooks/useReceipts';
import { useDisputes } from '@/hooks/useDisputes';
import { GlassPanel } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';
import { api, type Dispute, type Receipt } from '@/lib/api';

type VerificationSummary = {
  signature_valid?: boolean;
  principal_match?: boolean;
  payment_txid_confirmed?: boolean;
  bns_verified?: boolean;
};

export default function AuditPage() {
  const chain = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  const { address: walletAddress } = useWallet();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'bundle'>('csv');
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: receiptsData, isLoading: receiptsLoading } = useReceipts({
    seller_principal: walletAddress || undefined,
    limit: 100,
  });

  const { data: disputesData, isLoading: disputesLoading } = useDisputes({
    seller_principal: walletAddress || undefined,
  });

  const receipts = receiptsData?.receipts || [];
  const disputes = disputesData?.disputes || [];

  const cutoffTimestamp = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    if (dateRange === 'all') return 0;
    if (dateRange === '7d') return now - 7 * 24 * 60 * 60;
    if (dateRange === '30d') return now - 30 * 24 * 60 * 60;
    return now - 90 * 24 * 60 * 60;
  }, [dateRange]);

  const filteredReceipts = useMemo(
    () => receipts.filter((r) => r.timestamp >= cutoffTimestamp),
    [receipts, cutoffTimestamp]
  );

  const filteredDisputes = useMemo(
    () => disputes.filter((d) => d.created_at >= cutoffTimestamp),
    [disputes, cutoffTimestamp]
  );

  const receiptsForExport = useMemo(() => {
    if (selectedReceipts.length === 0) {
      return filteredReceipts;
    }

    const selected = new Set(selectedReceipts);
    return filteredReceipts.filter((r) => selected.has(r.receipt_id));
  }, [filteredReceipts, selectedReceipts]);

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);

    try {
      if (exportFormat === 'csv') {
        exportCSV(receiptsForExport);
      } else if (exportFormat === 'json') {
        exportJSON(receiptsForExport, filteredDisputes, walletAddress, dateRange);
      } else {
        await exportAuditBundle(receiptsForExport, filteredDisputes, walletAddress, dateRange, chain);
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toggleReceipt = (receiptId: string) => {
    setSelectedReceipts((prev) =>
      prev.includes(receiptId) ? prev.filter((id) => id !== receiptId) : [...prev, receiptId]
    );
  };

  const selectAll = () => {
    setSelectedReceipts(filteredReceipts.map((r) => r.receipt_id));
  };

  const deselectAll = () => {
    setSelectedReceipts([]);
  };

  const isLoading = receiptsLoading || disputesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="glass h-96 animate-pulse rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 font-serif text-4xl font-bold">Audit & Export Panel</h1>
          <p className="text-lg text-foreground-muted">
            Export audit bundles - compliance tooling - institutional positioning
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Total Receipts</p>
                <p className="mt-1 font-mono text-2xl font-bold">{filteredReceipts.length}</p>
              </div>
              <FileText className="h-6 w-6 text-accent" />
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Selected</p>
                <p className="mt-1 font-mono text-2xl font-bold">{receiptsForExport.length}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Disputes</p>
                <p className="mt-1 font-mono text-2xl font-bold">{filteredDisputes.length}</p>
              </div>
              <Shield className="h-6 w-6 text-warning" />
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Date Range</p>
                <p className="mt-1 text-sm font-semibold capitalize">{dateRange}</p>
              </div>
              <Calendar className="h-6 w-6 text-foreground-muted" />
            </div>
          </GlassPanel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <GlassPanel>
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-foreground-muted" />
                <h3 className="font-serif text-lg font-semibold">Filters</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-subtle">
                    Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                    className="w-full rounded-none border border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-subtle">
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                    className="w-full rounded-none border border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="csv">CSV (Spreadsheet)</option>
                    <option value="json">JSON (Raw Data)</option>
                    <option value="bundle">Audit Bundle (Comprehensive)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={selectAll}
                  className="rounded-none border border px-3 py-1 text-xs font-medium transition-colors hover:bg-background-raised"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="rounded-none border border px-3 py-1 text-xs font-medium transition-colors hover:bg-background-raised"
                >
                  Deselect All
                </button>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="mb-4">
                <h3 className="font-serif text-lg font-semibold">Receipts</h3>
                <p className="text-xs text-foreground-muted">Select receipts to include in export</p>
              </div>

              {filteredReceipts.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Receipts Found"
                  description="You don't have any receipts to export yet."
                />
              ) : (
                <div className="space-y-2">
                  {filteredReceipts.map((receipt) => (
                    <div
                      key={receipt.receipt_id}
                      onClick={() => toggleReceipt(receipt.receipt_id)}
                      className={`cursor-pointer rounded-none border border p-3 transition-all ${
                        selectedReceipts.includes(receipt.receipt_id)
                          ? 'border-accent bg-accent/5'
                          : 'hover:bg-background-raised/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                              selectedReceipts.includes(receipt.receipt_id)
                                ? 'border-accent bg-accent'
                                : 'border-foreground-muted'
                            }`}
                          >
                            {selectedReceipts.includes(receipt.receipt_id) && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-mono text-xs font-semibold">
                              {receipt.receipt_id.slice(0, 16)}...
                            </p>
                            <p className="text-xs text-foreground-muted">
                              {new Date(receipt.timestamp * 1000).toLocaleDateString()} - Block {receipt.block_height}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`rounded-none border px-2 py-1 text-xs font-semibold ${
                            receipt.revision === 1
                              ? 'border-success bg-success/10 text-success'
                              : 'border-warning bg-warning/10 text-warning'
                          }`}
                        >
                          {receipt.revision === 1 ? 'Delivered' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </div>

          <div className="space-y-6">
            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Export Configuration</h3>

              <div className="space-y-4">
                <div className="rounded-none border border bg-background p-3">
                  <p className="mb-2 text-xs font-semibold">Selected Format</p>
                  <p className="font-mono text-sm">
                    {exportFormat === 'csv' && 'CSV (Comma-Separated Values)'}
                    {exportFormat === 'json' && 'JSON (JavaScript Object Notation)'}
                    {exportFormat === 'bundle' && 'Audit Bundle (Comprehensive)'}
                  </p>
                </div>

                <div className="space-y-2 text-xs text-foreground-muted">
                  {exportFormat === 'csv' && (
                    <p>
                      CSV export includes: Receipt ID, Payment TxID, Principals, Block Height, Timestamp, Key Version,
                      Revision, Delivery Commitment
                    </p>
                  )}
                  {exportFormat === 'json' && (
                    <p>
                      JSON export includes all receipt and dispute data in structured JSON format for programmatic
                      processing.
                    </p>
                  )}
                  {exportFormat === 'bundle' && (
                    <p>
                      Audit bundle includes: Receipt data, signature verification status, on-chain proof links, dispute
                      records, refund details, and explorer URLs.
                    </p>
                  )}
                </div>

                {exportError && <p className="text-xs text-error">{exportError}</p>}

                <button
                  onClick={handleExport}
                  disabled={receiptsForExport.length === 0 || exporting}
                  className="flex w-full items-center justify-center gap-2 rounded-none border border-accent bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {exporting
                    ? 'Exporting...'
                    : `Export ${selectedReceipts.length > 0 ? `${selectedReceipts.length} ` : ''}${
                        exportFormat === 'csv' ? 'CSV' : exportFormat === 'json' ? 'JSON' : 'Bundle'
                      }`}
                </button>
              </div>
            </GlassPanel>

            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Compliance Features</h3>

              <div className="space-y-3 text-xs text-foreground-muted">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">Cryptographic Verification:</span> receipts are
                    verified during audit bundle export
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">On-chain Proof:</span> block hashes and explorer
                    links are included
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">Dispute Records:</span> full dispute history with
                    refund details
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">Timestamped:</span> ISO 8601 timestamps for all
                    exported events
                  </p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Institutional Use Cases</h3>

              <div className="space-y-2 text-xs text-foreground-muted">
                <p className="font-semibold text-foreground">Tax Reporting</p>
                <p>Export transaction history for cryptocurrency tax compliance and reporting.</p>

                <p className="mt-3 font-semibold text-foreground">Financial Audit</p>
                <p>Provide verifiable proof of revenue and transaction volume to auditors.</p>

                <p className="mt-3 font-semibold text-foreground">Dispute Resolution</p>
                <p>Export comprehensive evidence bundles for legal or arbitration proceedings.</p>

                <p className="mt-3 font-semibold text-foreground">Compliance Archive</p>
                <p>Maintain permanent records for regulatory compliance requirements.</p>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

function exportCSV(receipts: Receipt[]): void {
  const headers = [
    'Receipt ID',
    'Payment TxID',
    'Seller Principal',
    'Buyer Principal',
    'Block Height',
    'Timestamp',
    'Key Version',
    'Revision',
    'Delivery Commitment',
  ];

  const rows = receipts.map((r) => [
    r.receipt_id,
    r.payment_txid,
    r.seller_principal,
    r.buyer_principal || '',
    r.block_height,
    new Date(r.timestamp * 1000).toISOString(),
    r.key_version,
    r.revision,
    r.delivery_commitment || '',
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `receipts-${Date.now()}.csv`);
}

function exportJSON(
  receipts: Receipt[],
  disputes: Dispute[],
  walletAddress: string | null,
  dateRange: string
): void {
  const data = {
    exported_at: new Date().toISOString(),
    principal: walletAddress,
    date_range: dateRange,
    receipts,
    disputes,
  };

  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `audit-${Date.now()}.json`);
}

async function exportAuditBundle(
  receipts: Receipt[],
  disputes: Dispute[],
  walletAddress: string | null,
  dateRange: string,
  chain: 'mainnet' | 'testnet'
): Promise<void> {
  const verificationByReceiptId = await verifyReceipts(receipts);

  const bundle = {
    metadata: {
      exported_at: new Date().toISOString(),
      principal: walletAddress,
      date_range: dateRange,
      total_receipts: receipts.length,
      total_disputes: disputes.length,
    },
    receipts: receipts.map((r) => ({
      receipt_id: r.receipt_id,
      payment_txid: r.payment_txid,
      request_hash: r.request_hash,
      seller_principal: r.seller_principal,
      buyer_principal: r.buyer_principal,
      signature: r.signature,
      block_height: r.block_height,
      block_hash: r.block_hash,
      timestamp: r.timestamp,
      key_version: r.key_version,
      revision: r.revision,
      delivery_commitment: r.delivery_commitment,
      service_policy_hash: r.service_policy_hash,
      verification: {
        signature_valid: verificationByReceiptId[r.receipt_id]?.signature_valid ?? null,
        principal_match: verificationByReceiptId[r.receipt_id]?.principal_match ?? null,
        payment_confirmed: verificationByReceiptId[r.receipt_id]?.payment_txid_confirmed ?? null,
        bns_verified: verificationByReceiptId[r.receipt_id]?.bns_verified ?? null,
        delivery_confirmed: r.revision === 1,
        verification_error: verificationByReceiptId[r.receipt_id]?.verification_error || null,
        block_explorer_url: `https://explorer.hiro.so/txid/${r.payment_txid}?chain=${chain}`,
      },
    })),
    disputes,
  };

  downloadBlob(
    new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
    `audit-bundle-${Date.now()}.json`
  );
}

async function verifyReceipts(receipts: Receipt[]): Promise<Record<string, VerificationSummary & { verification_error?: string }>> {
  const verificationEntries = await Promise.all(
    receipts.map(async (receipt) => {
      try {
        const result = await api.verifyReceipt(receipt, { on_chain: true, bns: true });
        return [receipt.receipt_id, result.checks] as const;
      } catch (error) {
        return [
          receipt.receipt_id,
          {
            verification_error: error instanceof Error ? error.message : 'Verification failed',
          },
        ] as const;
      }
    })
  );

  return Object.fromEntries(verificationEntries);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
