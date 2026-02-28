'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, ExternalLink, ArrowLeft, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useReceipt } from '@/hooks/useReceipts';
import { api, type VerificationChecks } from '@/lib/api';
import { GlassPanel } from '@/components/GlassCard';
import { VerificationRow } from '@/components/VerificationRow';
import { EmptyState } from '@/components/EmptyState';

export default function ReceiptDetailPage() {
  const params = useParams();
  const receiptId = params.id as string;
  const { data: receipt, isLoading, error } = useReceipt(receiptId);

  const [copied, setCopied] = useState('');
  const [checks, setChecks] = useState<VerificationChecks | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const runVerification = async () => {
      if (!receipt) return;
      try {
        const result = await api.verifyReceipt(receipt);
        setChecks(result.checks);
      } catch (err) {
        setVerifyError(err instanceof Error ? err.message : 'Verification failed');
      }
    };
    runVerification();
  }, [receipt]);

  const handleCopy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(''), 1500);
  };

  const verificationRows = useMemo(() => {
    if (!checks) return [];
    return [
      {
        label: 'Seller signature valid',
        status: checks.signature_valid ? ('verified' as const) : ('failed' as const),
        details: checks.signature_valid
          ? 'Signature verified against seller principal'
          : 'Signature verification failed',
      },
      {
        label: 'Principal match',
        status: checks.principal_match === false ? ('failed' as const) : ('verified' as const),
        details: checks.principal_match === false ? 'Derived principal mismatch' : 'Principal check passed',
      },
      {
        label: 'Payment confirmation',
        status:
          checks.payment_txid_confirmed === undefined
            ? ('pending' as const)
            : checks.payment_txid_confirmed
              ? ('verified' as const)
              : ('failed' as const),
        details:
          checks.payment_txid_confirmed === undefined
            ? 'On-chain payment verification not requested'
            : checks.payment_txid_confirmed
              ? 'Payment tx confirmed'
              : 'Payment tx verification failed',
      },
      {
        label: 'BNS verification',
        status:
          checks.bns_verified === undefined
            ? ('pending' as const)
            : checks.bns_verified
              ? ('verified' as const)
              : ('failed' as const),
        details:
          checks.bns_verified === undefined
            ? 'BNS verification not requested'
            : checks.bns_verified
              ? 'BNS ownership verified'
              : 'BNS verification failed',
      },
    ];
  }, [checks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="glass animate-pulse h-96 rounded-none" />
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <EmptyState
            icon={Download}
            title="Receipt Not Found"
            description="This receipt could not be loaded."
            action={
              <Link
                href="/receipts"
                className="inline-flex items-center gap-2 rounded-none border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Receipts
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const chain = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/receipts"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Receipts
        </Link>

        <GlassPanel className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold">Receipt Verification</h1>
              <p className="mt-1 text-foreground-muted">Canonical signed receipt with payment proof metadata</p>
            </div>
            <div className="flex gap-2">
              <a
                href={`${apiUrl}/receipts/${receiptId}/pdf`}
                className="inline-flex items-center gap-2 rounded-none border border bg-background px-3 py-2 text-sm"
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
              <a
                href={`${apiUrl}/receipts/${receiptId}/csv`}
                className="inline-flex items-center gap-2 rounded-none border border bg-background px-3 py-2 text-sm"
              >
                <Download className="h-4 w-4" />
                CSV
              </a>
            </div>
          </div>
        </GlassPanel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <GlassPanel>
              <h2 className="mb-4 font-serif text-lg font-semibold">Verification Matrix</h2>
              {verifyError && <p className="mb-3 text-sm text-error">{verifyError}</p>}
              <div className="overflow-hidden rounded-none border border bg-background">
                {verificationRows.map((row) => (
                  <VerificationRow
                    key={row.label}
                    label={row.label}
                    status={row.status}
                    details={row.details}
                    expandable
                  />
                ))}
              </div>
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-4 font-serif text-lg font-semibold">Receipt Fields</h2>
              <div className="space-y-3 text-sm">
                {[
                  ['Receipt ID', receipt.receipt_id, 'receipt_id'],
                  ['Payment TXID', receipt.payment_txid, 'payment_txid'],
                  ['Seller Principal', receipt.seller_principal, 'seller'],
                  ['Buyer Principal', receipt.buyer_principal || 'N/A', 'buyer'],
                  ['Block Hash', receipt.block_hash, 'block_hash'],
                  ['Signature', receipt.signature, 'signature'],
                ].map(([label, value, key]) => (
                  <div key={String(key)}>
                    <p className="mb-1 text-xs text-foreground-subtle">{label}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-none border border bg-background px-3 py-2 font-mono text-xs break-all">
                        {value}
                      </div>
                      <button
                        onClick={() => handleCopy(String(value), String(key))}
                        className="rounded-none border border p-2 hover:bg-background-raised"
                      >
                        {copied === key ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-6">
            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">Timestamp</span>
                  <span>{new Date(receipt.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">Block Height</span>
                  <span className="font-mono">{receipt.block_height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">Revision</span>
                  <span className="font-mono">{receipt.revision}</span>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Links</h3>
              <div className="space-y-2">
                <Link
                  href={`/disputes/new?receipt_id=${receipt.receipt_id}`}
                  className="block rounded-none border border px-3 py-2 text-sm hover:bg-background-raised"
                >
                  File Dispute
                </Link>
                <a
                  href={`https://explorer.hiro.so/txid/${receipt.payment_txid}?chain=${chain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-none border border px-3 py-2 text-sm hover:bg-background-raised"
                >
                  View Payment TX
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
