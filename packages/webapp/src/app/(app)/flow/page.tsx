import { getNetwork } from '@/lib/network';
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Wallet,
} from 'lucide-react';
import { GlassPanel } from '@/components/GlassCard';
import { useWallet } from '@/hooks/useWallet';
import { api, type Receipt } from '@/lib/api';
import {
  createBrowserPaymentSignature,
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader,
  decodeReceiptHeader,
  formatMicroStx,
  normalizePaymentRequiredResponse,
  selectPaymentOption,
  storeLatestBrowserFlow,
  type X402PaymentOption,
  type X402PaymentRequiredResponse,
  type X402PaymentResponse,
} from '@/lib/x402-browser';
import { getTransactionExplorerUrl, signX402PaymentWithWallet } from '@/lib/wallet-transactions';

type DemoFlowKey = 'premium-data' | 'ai-inference';
type FlowStage =
  | 'idle'
  | 'requesting'
  | 'awaiting_wallet'
  | 'settling'
  | 'retrying'
  | 'success'
  | 'error';

interface FlowDefinition {
  key: DemoFlowKey;
  title: string;
  description: string;
  method: 'GET' | 'POST';
  path: string;
  body?: (prompt: string) => Record<string, unknown>;
}

const FLOWS: Record<DemoFlowKey, FlowDefinition> = {
  'premium-data': {
    key: 'premium-data',
    title: 'Premium Data',
    description: 'Fastest x402 buyer flow. Request protected market data and receive a signed receipt.',
    method: 'GET',
    path: '/demo/premium-data',
  },
  'ai-inference': {
    key: 'ai-inference',
    title: 'AI Inference',
    description: 'Run a paid prompt request and capture the same receipt + dispute lifecycle.',
    method: 'POST',
    path: '/demo/ai-inference',
    body: (prompt) => ({
      prompt,
      model: 'gpt-4',
    }),
  },
};

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
}

function getStacksNetwork() {
  return getNetwork();
}

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestProtectedResource(
  flow: FlowDefinition,
  idempotencyKey: string,
  aiPrompt: string,
  paymentSignature?: string
) {
  const headers = new Headers({
    Accept: 'application/json',
    'X-Idempotency-Key': idempotencyKey,
  });

  if (paymentSignature) {
    headers.set('payment-signature', paymentSignature);
  }

  let body: string | undefined;
  if (flow.body) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(flow.body(aiPrompt));
  }

  return fetch(`${getApiBaseUrl()}${flow.path}`, {
    method: flow.method,
    headers,
    body,
    cache: 'no-store',
  });
}

async function retryPaidRequest(
  flow: FlowDefinition,
  idempotencyKey: string,
  aiPrompt: string,
  paymentSignature: string
): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await requestProtectedResource(flow, idempotencyKey, aiPrompt, paymentSignature);
    if (response.ok) {
      return response;
    }

    const errorBody = await parseJsonSafe(response);
    const errorMessage =
      errorBody && typeof errorBody === 'object' && 'message' in errorBody
        ? String(errorBody.message)
        : '';

    if (
      (response.status === 402 || response.status === 422) &&
      /confirmed|block metadata|verification failed/i.test(errorMessage)
    ) {
      await new Promise((resolve) => window.setTimeout(resolve, 2_000));
      continue;
    }

    throw new Error(errorMessage || `Paid retry failed with status ${response.status}`);
  }

  throw new Error('Paid retry never settled into a confirmed receipt');
}

export default function BrowserFlowPage() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [selectedFlow, setSelectedFlow] = useState<DemoFlowKey>('premium-data');
  const [aiPrompt, setAiPrompt] = useState('Summarize the Bitcoin macro setup for the next 24 hours.');
  const [stage, setStage] = useState<FlowStage>('idle');
  const [challenge, setChallenge] = useState<X402PaymentRequiredResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<X402PaymentOption | null>(null);
  const [paymentTxId, setPaymentTxId] = useState('');
  const [paymentExplorerUrl, setPaymentExplorerUrl] = useState('');
  const [settlement, setSettlement] = useState<X402PaymentResponse | null>(null);
  const [responseBody, setResponseBody] = useState<unknown>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeFlow = FLOWS[selectedFlow];

  const handleStartFlow = async () => {
    if (!isConnected || !address) {
      connect('/flow');
      return;
    }

    if (selectedFlow === 'ai-inference' && !aiPrompt.trim()) {
      setError('Enter a prompt before running the paid AI flow');
      setStage('error');
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    const normalizedPrompt = aiPrompt.trim();

    setStage('requesting');
    setError(null);
    setChallenge(null);
    setSelectedOption(null);
    setPaymentTxId('');
    setPaymentExplorerUrl('');
    setSettlement(null);
    setResponseBody(null);
    setReceipt(null);

    try {
      const initialResponse = await requestProtectedResource(
        activeFlow,
        idempotencyKey,
        normalizedPrompt
      );
      const initialBody = await parseJsonSafe(initialResponse);

      if (initialResponse.ok) {
        const existingReceipt =
          decodeReceiptHeader(initialResponse.headers.get('X-stxact-Receipt')) ||
          (initialResponse.headers.get('X-stxact-Receipt-ID')
            ? await api.getReceipt(initialResponse.headers.get('X-stxact-Receipt-ID') as string)
            : null);

        if (!existingReceipt) {
          throw new Error('Protected response succeeded but no receipt was returned');
        }

        setReceipt(existingReceipt);
        setResponseBody(initialBody);
        storeLatestBrowserFlow(existingReceipt, JSON.stringify(initialBody, null, 2));
        setStage('success');
        return;
      }

      if (initialResponse.status !== 402) {
        throw new Error(
          initialBody && typeof initialBody === 'object' && 'message' in initialBody
            ? String(initialBody.message)
            : `Protected endpoint returned ${initialResponse.status}`
        );
      }

      const decodedChallenge =
        decodePaymentRequiredHeader(initialResponse.headers.get('payment-required')) ||
        normalizePaymentRequiredResponse(initialBody);

      if (!decodedChallenge) {
        throw new Error('x402 challenge was missing from the 402 response');
      }

      const acceptedOption = selectPaymentOption(decodedChallenge, getStacksNetwork());
      if (!acceptedOption) {
        throw new Error('No compatible STX payment option was returned for this network');
      }

      setChallenge(decodedChallenge);
      setSelectedOption(acceptedOption);
      setStage('awaiting_wallet');

      const payment = await signX402PaymentWithWallet({
        recipient: acceptedOption.payTo,
        amountMicroStx: acceptedOption.amount,
        memo: activeFlow.key === 'premium-data' ? 'stxact-proof' : 'stxact-ai',
        stxAddress: address,
      });

      setPaymentTxId(payment.txId);
      setPaymentExplorerUrl(payment.explorerUrl);
      setStage('settling');

      const paymentSignature = createBrowserPaymentSignature({
        x402Version: 2,
        resource: decodedChallenge.resource,
        accepted: acceptedOption,
        payload: {
          transaction: payment.signedTransaction,
        },
        payer: address,
      });

      setStage('retrying');
      const paidResponse = await retryPaidRequest(
        activeFlow,
        idempotencyKey,
        normalizedPrompt,
        paymentSignature
      );
      const paidBody = await parseJsonSafe(paidResponse);
      const resolvedReceipt =
        decodeReceiptHeader(paidResponse.headers.get('X-stxact-Receipt')) ||
        (paidResponse.headers.get('X-stxact-Receipt-ID')
          ? await api.getReceipt(paidResponse.headers.get('X-stxact-Receipt-ID') as string)
          : null);
      const paymentResponse = decodePaymentResponseHeader(
        paidResponse.headers.get('payment-response')
      );

      if (!resolvedReceipt) {
        throw new Error('Paid response completed but did not return a signed receipt');
      }

      if (paymentResponse) {
        setSettlement(paymentResponse);
      }

      if (paymentResponse?.transaction) {
        setPaymentTxId(paymentResponse.transaction);
        setPaymentExplorerUrl(getTransactionExplorerUrl(paymentResponse.transaction));
      } else if (resolvedReceipt.payment_txid) {
        setPaymentTxId(resolvedReceipt.payment_txid);
        setPaymentExplorerUrl(getTransactionExplorerUrl(resolvedReceipt.payment_txid));
      }

      setReceipt(resolvedReceipt);
      setResponseBody(paidBody);
      storeLatestBrowserFlow(resolvedReceipt, JSON.stringify(paidBody, null, 2));
      setStage('success');
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Flow failed');
      setStage('error');
    }
  };

  const stepStates = [
    {
      label: 'Receive x402 challenge',
      active: stage === 'requesting',
      complete: ['awaiting_wallet', 'settling', 'retrying', 'success'].includes(stage),
    },
    {
      label: 'Sign wallet payment',
      active: stage === 'awaiting_wallet',
      complete: ['settling', 'retrying', 'success'].includes(stage) && !!paymentTxId,
    },
    {
      label: 'Retry through facilitator',
      active: stage === 'settling' || stage === 'retrying',
      complete: stage === 'success',
    },
    {
      label: 'Capture signed receipt',
      active: false,
      complete: stage === 'success' && !!receipt,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 border-b border pb-6">
          <h1 className="mb-3 font-serif text-4xl font-bold">Live x402 Buyer Flow</h1>
          <p className="max-w-3xl text-lg text-foreground-muted">
            Request a protected endpoint, sign the x402 payment with the connected wallet, let the
            facilitator settle it, and land directly in the receipt, verification, and dispute lifecycle.
          </p>
        </div>

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
          <div className="min-w-0 space-y-6">
            <GlassPanel>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-semibold">Choose the live flow</h2>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Use Premium Data for the fastest demo, or AI Inference to show a paid POST flow
                    against the real x402 v2 payment path.
                  </p>
                </div>
                <div className="min-w-0 rounded-none border border bg-background px-3 py-2 text-xs font-medium">
                  Buyer wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'not connected'}
                </div>
              </div>

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                {Object.values(FLOWS).map((flow) => {
                  const active = flow.key === selectedFlow;
                  return (
                    <button
                      key={flow.key}
                      onClick={() => setSelectedFlow(flow.key)}
                      className={`rounded-none border p-4 text-left transition-colors ${
                        active
                          ? 'border-accent bg-background-raised'
                          : 'border hover:border-accent hover:bg-background-raised'
                      }`}
                    >
                      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                        <span className="font-serif text-lg font-semibold">{flow.title}</span>
                        <span className="text-xs font-medium text-foreground-subtle">{flow.method}</span>
                      </div>
                      <p className="text-sm text-foreground-muted">{flow.description}</p>
                      <p className="mt-3 break-all font-mono text-xs text-foreground-subtle">{flow.path}</p>
                    </button>
                  );
                })}
              </div>

              {selectedFlow === 'ai-inference' && (
                <div className="mt-4 rounded-none border border bg-background p-4">
                  <label htmlFor="ai-prompt" className="mb-2 block text-sm font-medium">
                    Prompt for the paid AI request
                  </label>
                  <textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={4}
                    className="w-full rounded-none border border bg-background-raised px-4 py-3 font-mono text-sm"
                  />
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleStartFlow}
                  disabled={
                    stage === 'requesting' ||
                    stage === 'awaiting_wallet' ||
                    stage === 'settling' ||
                    stage === 'retrying'
                  }
                  className="inline-flex items-center gap-2 rounded-none border border-foreground bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {stage === 'requesting' ||
                  stage === 'awaiting_wallet' ||
                  stage === 'settling' ||
                  stage === 'retrying' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isConnected ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {isConnected ? 'Run Live Flow' : isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>

                <Link
                  href="/directory"
                  className="inline-flex items-center gap-2 rounded-none border border px-5 py-3 text-sm font-medium hover:border-accent hover:bg-background-raised"
                >
                  Open Directory
                </Link>
              </div>
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-4 font-serif text-xl font-semibold">Lifecycle status</h2>
              <div className="space-y-3">
                {stepStates.map((step) => (
                  <div key={step.label} className="flex items-start gap-3 rounded-none border border bg-background p-3">
                    {step.complete ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                    ) : step.active ? (
                      <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 text-foreground-subtle" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-foreground-muted">
                        {step.label === 'Receive x402 challenge' &&
                          'Initial request should return a payment-required challenge instead of content.'}
                        {step.label === 'Sign wallet payment' &&
                          'The wallet signs the unsigned STX transfer without broadcasting it locally.'}
                        {step.label === 'Retry through facilitator' &&
                          'The signed transaction is sent back in the x402 v2 payment-signature payload and settled server-side.'}
                        {step.label === 'Capture signed receipt' &&
                          'Once settlement succeeds, the app stores the returned signed receipt and delivered payload.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-4 font-serif text-xl font-semibold">Proof artifacts</h2>
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <div className="rounded-none border border bg-background p-4">
                  <p className="text-xs font-medium text-foreground-subtle">x402 challenge</p>
                  {selectedOption ? (
                    <dl className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between gap-4">
                        <dt>Amount</dt>
                        <dd className="font-mono">{formatMicroStx(selectedOption.amount)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Asset</dt>
                        <dd className="font-mono">{selectedOption.asset}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Network</dt>
                        <dd className="font-mono">{selectedOption.network}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt>Pay to</dt>
                        <dd className="break-all font-mono">{selectedOption.payTo}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-foreground-muted">
                      Run the flow to decode the live x402 payment-required challenge.
                    </p>
                  )}
                </div>

                <div className="rounded-none border border bg-background p-4">
                  <p className="text-xs font-medium text-foreground-subtle">Payment transaction</p>
                  {paymentTxId ? (
                    <div className="mt-3 space-y-3 text-xs">
                      <p className="break-all font-mono">{paymentTxId}</p>
                      <a
                        href={paymentExplorerUrl || getTransactionExplorerUrl(paymentTxId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                      >
                        View on Hiro
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-foreground-muted">
                      The signed payment transaction id will appear here before the paid retry finishes.
                    </p>
                  )}
                </div>
              </div>

              {settlement && (
                <div className="mt-4 rounded-none border border bg-background p-4">
                  <p className="text-xs font-medium text-foreground-subtle">
                    Facilitator settlement response
                  </p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-foreground">
                    {JSON.stringify(settlement, null, 2)}
                  </pre>
                </div>
              )}

              {challenge && (
                <div className="mt-4 rounded-none border border bg-background p-4">
                  <p className="text-xs font-medium text-foreground-subtle">Raw challenge payload</p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-foreground">
                    {JSON.stringify(challenge, null, 2)}
                  </pre>
                </div>
              )}
            </GlassPanel>

            {error && (
              <GlassPanel>
                <div className="flex items-start gap-3 text-sm text-error">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              </GlassPanel>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <GlassPanel>
              <h2 className="mb-4 font-serif text-xl font-semibold">Outcome</h2>
              {!receipt ? (
                <p className="text-sm text-foreground-muted">
                  Once the paid retry succeeds, this panel will show the signed receipt, the protected
                  response payload, and the next browser steps for the full proof lifecycle.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-none border border-success bg-success/10 p-4">
                    <p className="text-sm font-semibold text-success">Receipt captured</p>
                    <p className="mt-1 break-all font-mono text-xs">{receipt.receipt_id}</p>
                  </div>

                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between gap-4">
                      <dt>Buyer</dt>
                      <dd className="min-w-0 break-all text-right font-mono">
                        {receipt.buyer_principal || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Seller</dt>
                      <dd className="min-w-0 break-all text-right font-mono">
                        {receipt.seller_principal}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Payment TX</dt>
                      <dd className="min-w-0 break-all text-right font-mono">
                        {receipt.payment_txid.slice(0, 18)}...
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt>Delivery commitment</dt>
                      <dd className="break-all font-mono">{receipt.delivery_commitment || 'N/A'}</dd>
                    </div>
                  </dl>

                  <div className="space-y-3 border-t border pt-4">
                    <Link
                      href={`/receipts/${receipt.receipt_id}`}
                      className="block rounded-none border border px-4 py-3 text-sm font-medium hover:border-accent hover:bg-background-raised"
                    >
                      Open receipt detail
                    </Link>
                    <Link
                      href="/receipts/verify"
                      className="block rounded-none border border px-4 py-3 text-sm font-medium hover:border-accent hover:bg-background-raised"
                    >
                      Verify latest receipt
                    </Link>
                    <Link
                      href={`/disputes/new?receipt_id=${receipt.receipt_id}`}
                      className="block rounded-none border border px-4 py-3 text-sm font-medium hover:border-accent hover:bg-background-raised"
                    >
                      File buyer dispute
                    </Link>
                    <Link
                      href="/seller"
                      className="block rounded-none border border px-4 py-3 text-sm font-medium hover:border-accent hover:bg-background-raised"
                    >
                      Open seller dashboard in second browser
                    </Link>
                  </div>
                </div>
              )}
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-4 font-serif text-xl font-semibold">Protected response</h2>
              {responseBody ? (
                <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-none border border bg-background p-4 text-xs text-foreground">
                  {JSON.stringify(responseBody, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-foreground-muted">
                  The delivered payload will appear here after the paid retry succeeds. The same payload is cached
                  in-session so the Verify page can compare it against the receipt delivery commitment.
                </p>
              )}
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
