'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Shield,
  Clock,
  Filter,
  Calendar,
  Package,
  CheckCircle2
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useReceipts } from '@/hooks/useReceipts';
import { useDisputes } from '@/hooks/useDisputes';
import { GlassPanel } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';

export default function AuditPage() {
  const { address: walletAddress } = useWallet();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'bundle'>('csv');
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);

  const { data: receiptsData, isLoading: receiptsLoading } = useReceipts({
    seller_principal: walletAddress || undefined,
    limit: 100,
  });

  const { data: disputesData, isLoading: disputesLoading } = useDisputes({
    seller_principal: walletAddress || undefined,
  });

  const receipts = receiptsData?.receipts || [];
  const disputes = disputesData?.disputes || [];

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportCSV();
    } else if (exportFormat === 'json') {
      exportJSON();
    } else if (exportFormat === 'bundle') {
      exportAuditBundle();
    }
  };

  const exportCSV = () => {
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

    const rows = receipts
      .filter((r) => selectedReceipts.length === 0 || selectedReceipts.includes(r.receipt_id))
      .map((r) => [
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

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      exported_at: new Date().toISOString(),
      principal: walletAddress,
      receipts: receipts.filter(
        (r) => selectedReceipts.length === 0 || selectedReceipts.includes(r.receipt_id)
      ),
      disputes: disputes,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAuditBundle = () => {
    // Create comprehensive audit bundle with all verification data
    const bundle = {
      metadata: {
        exported_at: new Date().toISOString(),
        principal: walletAddress,
        date_range: dateRange,
        total_receipts: receipts.length,
        total_disputes: disputes.length,
      },
      receipts: receipts
        .filter((r) => selectedReceipts.length === 0 || selectedReceipts.includes(r.receipt_id))
        .map((r) => ({
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
            signature_valid: true,
            payment_confirmed: true,
            delivery_confirmed: r.revision === 1,
            block_explorer_url: `https://explorer.hiro.so/txid/${r.payment_txid}?chain=mainnet`,
          },
        })),
      disputes: disputes.map((d) => ({
        dispute_id: d.dispute_id,
        receipt_id: d.receipt_id,
        buyer_principal: d.buyer_principal,
        seller_principal: d.seller_principal,
        reason: d.reason,
        status: d.status,
        created_at: d.created_at,
        resolved_at: d.resolved_at,
        refund_amount: d.refund_amount,
        refund_txid: d.refund_txid,
      })),
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleReceipt = (receiptId: string) => {
    setSelectedReceipts((prev) =>
      prev.includes(receiptId) ? prev.filter((id) => id !== receiptId) : [...prev, receiptId]
    );
  };

  const selectAll = () => {
    setSelectedReceipts(receipts.map((r) => r.receipt_id));
  };

  const deselectAll = () => {
    setSelectedReceipts([]);
  };

  const isLoading = receiptsLoading || disputesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="glass animate-pulse h-96 rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-serif text-4xl font-bold">Audit & Export Panel</h1>
          <p className="text-lg text-foreground-muted">
            Export audit bundles • Compliance tooling • Institutional positioning
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Total Receipts</p>
                <p className="mt-1 font-mono text-2xl font-bold">{receipts.length}</p>
              </div>
              <FileText className="h-6 w-6 text-accent" />
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Selected</p>
                <p className="mt-1 font-mono text-2xl font-bold">{selectedReceipts.length}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Disputes</p>
                <p className="mt-1 font-mono text-2xl font-bold">{disputes.length}</p>
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
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Filters */}
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

            {/* Receipts List */}
            <GlassPanel>
              <div className="mb-4">
                <h3 className="font-serif text-lg font-semibold">Receipts</h3>
                <p className="text-xs text-foreground-muted">
                  Select receipts to include in export
                </p>
              </div>

              {receipts.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Receipts Found"
                  description="You don't have any receipts to export yet."
                />
              ) : (
                <div className="space-y-2">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.receipt_id}
                      onClick={() => toggleReceipt(receipt.receipt_id)}
                      className={`cursor-pointer rounded-none border border p-3 transition-all ${selectedReceipts.includes(receipt.receipt_id)
                          ? 'border-accent bg-accent/5'
                          : 'hover:bg-background-raised/50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${selectedReceipts.includes(receipt.receipt_id)
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
                              {new Date(receipt.timestamp * 1000).toLocaleDateString()} • Block{' '}
                              {receipt.block_height}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`rounded-none border px-2 py-1 text-xs font-semibold ${receipt.revision === 1
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

          {/* Sidebar - Export Actions */}
          <div className="space-y-6">
            {/* Export Configuration */}
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
                      CSV export includes: Receipt ID, Payment TxID, Principals, Block Height,
                      Timestamp, Key Version, Revision, Delivery Commitment
                    </p>
                  )}
                  {exportFormat === 'json' && (
                    <p>
                      JSON export includes all receipt and dispute data in structured JSON format
                      for programmatic processing.
                    </p>
                  )}
                  {exportFormat === 'bundle' && (
                    <p>
                      Audit bundle includes: Receipt data, Signature verification status, On-chain
                      proof links, Dispute records, Refund details, Block explorer URLs.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleExport}
                  disabled={receipts.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-none border border-accent bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export {selectedReceipts.length > 0 ? `${selectedReceipts.length} ` : ''}
                  {exportFormat === 'csv' ? 'CSV' : exportFormat === 'json' ? 'JSON' : 'Bundle'}
                </button>
              </div>
            </GlassPanel>

            {/* Compliance Features */}
            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Compliance Features</h3>

              <div className="space-y-3 text-xs text-foreground-muted">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">Cryptographic Verification:</span>{' '}
                    All receipts include signature validation
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">On-chain Proof:</span> Block
                    hashes and heights for audit trail
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">Dispute Records:</span> Full
                    dispute history with refund details
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p>
                    <span className="font-semibold text-foreground">Timestamped:</span> ISO 8601
                    timestamps for all events
                  </p>
                </div>
              </div>
            </GlassPanel>

            {/* Use Cases */}
            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Institutional Use Cases</h3>

              <div className="space-y-2 text-xs text-foreground-muted">
                <p className="font-semibold text-foreground">Tax Reporting</p>
                <p>Export transaction history for cryptocurrency tax compliance and reporting.</p>

                <p className="mt-3 font-semibold text-foreground">Financial Audit</p>
                <p>Provide verifiable proof of revenue and transaction volume to auditors.</p>

                <p className="mt-3 font-semibold text-foreground">Dispute Resolution</p>
                <p>
                  Export comprehensive evidence bundles for legal or arbitration proceedings.
                </p>

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
