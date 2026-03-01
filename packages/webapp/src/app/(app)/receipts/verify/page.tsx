'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertTriangle, FileUp } from 'lucide-react';
import { api, type Receipt } from '@/lib/api';
import { GlassPanel } from '@/components/GlassCard';

async function sha256Hex(payload: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function VerifyReceiptPage() {
  const [input, setInput] = useState('');
  const [verifyOnChain, setVerifyOnChain] = useState(true);
  const [verifyBns, setVerifyBns] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    valid: boolean;
    checks: {
      signature_valid: boolean;
      principal_match?: boolean;
      payment_txid_confirmed?: boolean;
      bns_verified?: boolean;
    };
  } | null>(null);
  const [artifactText, setArtifactText] = useState('');
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [artifactHash, setArtifactHash] = useState<string | null>(null);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [hashingArtifact, setHashingArtifact] = useState(false);

  const parsedInput = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return JSON.parse(input) as Receipt;
    } catch {
      return null;
    }
  }, [input]);

  const runVerification = async () => {
    setError(null);
    setResult(null);

    if (!parsedInput) {
      setError('Enter a valid receipt JSON payload');
      return;
    }

    setLoading(true);
    try {
      const response = await api.verifyReceipt(parsedInput, {
        on_chain: verifyOnChain,
        bns: verifyBns,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const computeArtifactHash = async () => {
    setArtifactError(null);
    setArtifactHash(null);

    if (!parsedInput?.delivery_commitment) {
      setArtifactError('The receipt has no delivery commitment to compare against');
      return;
    }

    if (!artifactFile && !artifactText.trim()) {
      setArtifactError('Provide a file or response text to validate delivery proof');
      return;
    }

    setHashingArtifact(true);
    try {
      let payload: Uint8Array;
      if (artifactFile) {
        const buffer = await artifactFile.arrayBuffer();
        payload = new Uint8Array(buffer);
      } else {
        payload = new TextEncoder().encode(artifactText);
      }

      const hash = await sha256Hex(payload);
      setArtifactHash(hash);
    } catch (hashError) {
      setArtifactError(hashError instanceof Error ? hashError.message : 'Failed to compute artifact hash');
    } finally {
      setHashingArtifact(false);
    }
  };

  const checks = result?.checks;
  const committedDeliveryHash = parsedInput?.delivery_commitment || null;
  const deliveryProofMatched =
    !!artifactHash &&
    !!committedDeliveryHash &&
    artifactHash.toLowerCase() === committedDeliveryHash.toLowerCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/receipts"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Receipts
        </Link>

        <div className="mb-8 border-b border pb-6">
          <h1 className="mb-2 font-serif text-4xl font-bold">Verify Receipt JSON</h1>
          <p className="text-foreground-muted">
            Run signature checks and validate delivery proof hash using the actual response artifact.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <GlassPanel>
              <label htmlFor="receipt-json" className="mb-2 block text-sm font-medium">
                Receipt JSON
              </label>
              <textarea
                id="receipt-json"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='{"receipt_id":"...","signature":"..."}'
                className="h-80 w-full rounded-none border border bg-background px-4 py-3 font-mono text-xs"
              />
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-3 font-serif text-lg font-semibold">Delivery Proof Validator</h2>
              <p className="mb-4 text-xs text-foreground-muted">
                Upload the response artifact (or paste response text), compute SHA-256, and compare with receipt
                delivery commitment.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="artifact-file" className="mb-2 block text-sm font-medium">
                    Response File
                  </label>
                  <input
                    id="artifact-file"
                    type="file"
                    onChange={(e) => setArtifactFile(e.target.files?.[0] || null)}
                    className="w-full rounded-none border border bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="artifact-text" className="mb-2 block text-sm font-medium">
                    Or Response Text
                  </label>
                  <textarea
                    id="artifact-text"
                    value={artifactText}
                    onChange={(e) => setArtifactText(e.target.value)}
                    rows={6}
                    className="w-full rounded-none border border bg-background px-3 py-2 font-mono text-xs"
                    placeholder="Paste JSON or plaintext response body"
                  />
                </div>

                <button
                  onClick={computeArtifactHash}
                  disabled={hashingArtifact}
                  className="inline-flex items-center gap-2 rounded-none border border px-4 py-2 text-sm font-medium hover:border-accent hover:bg-background-raised disabled:opacity-50"
                >
                  <FileUp className="h-4 w-4" />
                  {hashingArtifact ? 'Computing Hash...' : 'Compute Delivery Hash'}
                </button>
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-6">
            <GlassPanel>
              <h2 className="mb-4 font-serif text-lg font-semibold">Verification Options</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={verifyOnChain}
                    onChange={(e) => setVerifyOnChain(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Validate payment tx on-chain
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={verifyBns}
                    onChange={(e) => setVerifyBns(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Validate BNS ownership
                </label>
              </div>

              <button
                onClick={runVerification}
                disabled={loading}
                className="mt-5 w-full rounded-none border border bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Run Verification'}
              </button>
            </GlassPanel>

            {error && (
              <GlassPanel>
                <div className="flex items-start gap-2 text-sm text-error">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <p>{error}</p>
                </div>
              </GlassPanel>
            )}

            {artifactError && (
              <GlassPanel>
                <div className="flex items-start gap-2 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <p>{artifactError}</p>
                </div>
              </GlassPanel>
            )}

            <GlassPanel>
              <h2 className="mb-4 font-serif text-lg font-semibold">Delivery Proof Result</h2>
              <dl className="space-y-2 text-xs">
                <div className="space-y-1">
                  <dt className="text-foreground-subtle">Committed hash</dt>
                  <dd className="break-all font-mono">{committedDeliveryHash || 'not provided in receipt'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-foreground-subtle">Computed hash</dt>
                  <dd className="break-all font-mono">{artifactHash || 'not computed'}</dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="text-foreground-subtle">Delivery hash match</dt>
                  <dd
                    className={`font-semibold ${
                      artifactHash && committedDeliveryHash
                        ? deliveryProofMatched
                          ? 'text-success'
                          : 'text-error'
                        : 'text-foreground-muted'
                    }`}
                  >
                    {artifactHash && committedDeliveryHash
                      ? deliveryProofMatched
                        ? 'yes'
                        : 'no'
                      : 'not checked'}
                  </dd>
                </div>
              </dl>
            </GlassPanel>

            {result && (
              <GlassPanel>
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${result.valid ? 'text-success' : 'text-error'}`} />
                  <h2 className="font-serif text-lg font-semibold">
                    {result.valid ? 'Receipt Valid' : 'Receipt Invalid'}
                  </h2>
                </div>

                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground-subtle">Signature valid</dt>
                    <dd>{checks?.signature_valid ? 'yes' : 'no'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground-subtle">Principal match</dt>
                    <dd>
                      {checks?.principal_match === undefined
                        ? 'not checked'
                        : checks.principal_match
                          ? 'yes'
                          : 'no'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground-subtle">Payment confirmed</dt>
                    <dd>
                      {checks?.payment_txid_confirmed === undefined
                        ? 'not checked'
                        : checks.payment_txid_confirmed
                          ? 'yes'
                          : 'no'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground-subtle">BNS verified</dt>
                    <dd>
                      {checks?.bns_verified === undefined
                        ? 'not checked'
                        : checks.bns_verified
                          ? 'yes'
                          : 'no'}
                    </dd>
                  </div>
                </dl>
              </GlassPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
