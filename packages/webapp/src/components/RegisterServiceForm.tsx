import { getTransactionUrl } from '@/lib/stacks';
'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { api, type Token } from '@/lib/api';
import { signWithWallet } from '@/lib/signing';

type RegistrationState = 'idle' | 'signing' | 'submitting' | 'success' | 'error';

interface FormData {
  endpointUrl: string;
  policyHash: string;
  bnsName: string;
  category: string;
  tokenSymbols: string;
  policyUrl: string;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeTokens(input: string): Token[] {
  const values = input
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return [{ symbol: 'STX' }];
  }

  return values.map((symbol) => ({ symbol }));
}

export function RegisterServiceForm() {
  const { address, isConnected } = useWallet();

  const [state, setState] = useState<RegistrationState>('idle');
  const [formData, setFormData] = useState<FormData>({
    endpointUrl: '',
    policyHash: '',
    bnsName: '',
    category: 'data-api',
    tokenSymbols: 'STX',
    policyUrl: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};

    try {
      new URL(formData.endpointUrl);
    } catch {
      nextErrors.endpointUrl = 'Invalid endpoint URL';
    }

    if (!/^[0-9a-fA-F]{64}$/.test(formData.policyHash)) {
      nextErrors.policyHash = 'Policy hash must be 64 hex characters';
    }

    if (formData.policyUrl) {
      try {
        new URL(formData.policyUrl);
      } catch {
        nextErrors.policyUrl = 'Invalid policy URL';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      const normalizedEndpointUrl = new URL(formData.endpointUrl).toString();
      const policyHash = formData.policyHash.toLowerCase();
      const timestamp = Math.floor(Date.now() / 1000);

      setState('signing');

      const endpointHashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(normalizedEndpointUrl)
      );
      const endpointHash = toHex(endpointHashBuffer);

      const canonicalMessage = [
        'STXACT-REGISTER',
        endpointHash,
        policyHash,
        formData.bnsName.trim(),
        timestamp.toString(),
      ].join(':');

      const signature = await signWithWallet(canonicalMessage);

      setState('submitting');

      const response = await api.registerService({
        endpoint_url: normalizedEndpointUrl,
        policy_hash: policyHash,
        bns_name: formData.bnsName.trim() || undefined,
        category: formData.category,
        supported_tokens: normalizeTokens(formData.tokenSymbols),
        policy_url: formData.policyUrl.trim() || undefined,
        signature,
        timestamp,
      });

      setTxId(response.tx_hash);
      setState('success');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  if (!isConnected) {
    return (
      <div className="glass rounded-none p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-warning" />
        <h3 className="mt-4 font-serif text-xl font-semibold">Wallet Not Connected</h3>
        <p className="mt-2 text-foreground-muted">Connect your wallet to sign service registration.</p>
      </div>
    );
  }

  if (state === 'success') {
        return (
      <div className="glass rounded-none p-8">
        <div className="flex flex-col items-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-success" />
          <div className="text-center">
            <h3 className="font-serif text-2xl font-semibold text-success">Service Registered</h3>
            <p className="mt-2 text-foreground-muted">
              Registration has been submitted through the backend and broadcast on-chain.
            </p>
          </div>

          {txId && (
            <a
              href={getTransactionUrl(txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              View transaction
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-none p-8">
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold">Register Service</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Sign a canonical registration payload and submit through `POST /directory/register`.
          </p>
        </div>

        <div>
          <label htmlFor="endpointUrl" className="block text-sm font-medium">
            Service Endpoint URL *
          </label>
          <input
            id="endpointUrl"
            type="url"
            value={formData.endpointUrl}
            onChange={(e) => setFormData({ ...formData, endpointUrl: e.target.value })}
            className="mt-1 w-full rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="https://api.example.com"
            disabled={state !== 'idle' && state !== 'error'}
          />
          {errors.endpointUrl && <p className="mt-1 text-sm text-error">{errors.endpointUrl}</p>}
        </div>

        <div>
          <label htmlFor="policyHash" className="block text-sm font-medium">
            Policy Hash *
          </label>
          <input
            id="policyHash"
            type="text"
            value={formData.policyHash}
            onChange={(e) => setFormData({ ...formData, policyHash: e.target.value })}
            className="mt-1 w-full rounded-none border border bg-background px-4 py-2 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="64-char sha256 hex"
            maxLength={64}
            disabled={state !== 'idle' && state !== 'error'}
          />
          {errors.policyHash && <p className="mt-1 text-sm text-error">{errors.policyHash}</p>}
        </div>

        <div>
          <label htmlFor="policyUrl" className="block text-sm font-medium">
            Policy URL (Optional)
          </label>
          <input
            id="policyUrl"
            type="url"
            value={formData.policyUrl}
            onChange={(e) => setFormData({ ...formData, policyUrl: e.target.value })}
            className="mt-1 w-full rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="https://example.com/policy.json"
            disabled={state !== 'idle' && state !== 'error'}
          />
          {errors.policyUrl && <p className="mt-1 text-sm text-error">{errors.policyUrl}</p>}
        </div>

        <div>
          <label htmlFor="bnsName" className="block text-sm font-medium">
            BNS Name (Optional)
          </label>
          <input
            id="bnsName"
            type="text"
            value={formData.bnsName}
            onChange={(e) => setFormData({ ...formData, bnsName: e.target.value })}
            className="mt-1 w-full rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="yield-api.btc"
            disabled={state !== 'idle' && state !== 'error'}
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium">
            Category *
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1 w-full rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            disabled={state !== 'idle' && state !== 'error'}
          >
            <option value="data-api">Data API</option>
            <option value="ai-compute">AI Compute</option>
            <option value="storage">Storage</option>
            <option value="analytics">Analytics</option>
            <option value="oracle">Oracle</option>
            <option value="yield">Yield</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="tokenSymbols" className="block text-sm font-medium">
            Supported Tokens *
          </label>
          <input
            id="tokenSymbols"
            type="text"
            value={formData.tokenSymbols}
            onChange={(e) => setFormData({ ...formData, tokenSymbols: e.target.value })}
            className="mt-1 w-full rounded-none border border bg-background px-4 py-2 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="STX,sBTC"
            disabled={state !== 'idle' && state !== 'error'}
          />
        </div>

        {error && (
          <div className="rounded-none border border-error bg-error/10 p-4">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={state === 'signing' || state === 'submitting'}
          className="w-full rounded-none bg-accent px-4 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {state === 'idle' || state === 'error' ? 'Sign & Register' : null}
          {state === 'signing' ? (
            <>
              <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
              Waiting for wallet signature...
            </>
          ) : null}
          {state === 'submitting' ? (
            <>
              <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
              Submitting registration...
            </>
          ) : null}
        </button>
      </div>
    </form>
  );
}
