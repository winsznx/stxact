'use client';

import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { openSTXTransfer } from '@stacks/connect';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import type { Receipt } from '@/lib/api';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceEndpoint: string;
    serviceName: string;
    amount: number; // in STX
    onSuccess?: (receipt: Receipt) => void;
}

type PaymentState = 'idle' | 'initiating' | 'signing' | 'processing' | 'success' | 'error';

export function PaymentModal({
    isOpen,
    onClose,
    serviceEndpoint,
    serviceName,
    amount,
    onSuccess,
}: PaymentModalProps) {
    const [state, setState] = useState<PaymentState>('idle');
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [txId, setTxId] = useState<string | null>(null);

    const handlePayment = async () => {
        try {
            setState('initiating');
            setError(null);

            // Step 1: Make initial request to get 402 payment challenge
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const initialResponse = await fetch(`${apiUrl}${serviceEndpoint}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (initialResponse.status !== 402) {
                if (initialResponse.ok) throw new Error('No payment required');
                throw new Error('Service did not return payment challenge');
            }

            // Extract payment details
            const paymentChallenge = initialResponse.headers.get('X-Payment-Challenge');
            if (!paymentChallenge) throw new Error('No payment address received from service');

            const amountMicroStx = Math.floor(amount * 1_000_000).toString();

            setState('signing');

            const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet';
            const network = isMainnet ? STACKS_MAINNET : STACKS_TESTNET;

            // Step 2: Trigger Wallet Transaction
            await openSTXTransfer({
                recipient: paymentChallenge,
                amount: amountMicroStx,
                memo: 'x402 Payment',
                network,
                appDetails: {
                    name: 'stxact',
                    icon: window.location.origin + '/favicon.ico',
                },
                onFinish: async (data: any) => {
                    try {
                        setState('processing');
                        const txId = data.txId;
                        setTxId(txId);

                        // Step 3: Verify Payment with Service (Retry with proof)
                        // Note: Service might require tx confirmation, but many support 0-conf (mempool)
                        const paidResponse = await fetch(`${apiUrl}${serviceEndpoint}`, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'X-Payment-TxId': txId,
                            },
                        });

                        if (!paidResponse.ok) {
                            // If 402 still, payment not found yet. In a real app, might need polling.
                            throw new Error('Payment verification failed. Transaction might be pending.');
                        }

                        // Step 4: Extract Receipt
                        const receiptHeader = paidResponse.headers.get('X-stxact-Receipt');
                        if (!receiptHeader) throw new Error('No receipt received after payment');

                        const receiptData = JSON.parse(atob(receiptHeader)) as Receipt;
                        setReceipt(receiptData);
                        setState('success');

                        if (onSuccess) onSuccess(receiptData);
                    } catch (innerErr) {
                        console.error('Verification error:', innerErr);
                        setError(innerErr instanceof Error ? innerErr.message : 'Verification failed');
                        setState('error');
                    }
                },
                onCancel: () => {
                    setState('idle');
                },
            });

        } catch (err) {
            console.error('Payment error:', err);
            setError(err instanceof Error ? err.message : 'Payment failed');
            setState('error');
        }
    };

    const handleClose = () => {
        if (state === 'signing' || state === 'processing') {
            // Don't allow closing during critical operations
            return;
        }
        onClose();
        // Reset state after a delay to avoid flash
        setTimeout(() => {
            setState('idle');
            setReceipt(null);
            setError(null);
            setTxId(null);
        }, 300);
    };

    const downloadPDF = () => {
        if (!receipt) return;
        window.open(`/api/receipts/${receipt.receipt_id}/pdf`, '_blank');
    };

    const downloadCSV = () => {
        if (!receipt) return;
        window.open(`/api/receipts/${receipt.receipt_id}/csv`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="glass-strong relative w-full max-w-md rounded-none border border-strong p-6 shadow-2xl">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    disabled={state === 'signing' || state === 'processing'}
                    className="absolute right-4 top-4 rounded-none p-1 hover:bg-background-overlay disabled:opacity-50"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h2 className="font-serif text-2xl font-bold">Payment Required</h2>
                        <p className="mt-1 text-sm text-foreground-muted">
                            {serviceName}
                        </p>
                    </div>

                    {/* Amount */}
                    <div className="glass rounded-none p-4">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm text-foreground-muted">Amount</span>
                            <div className="text-right">
                                <span className="font-mono text-3xl font-bold">{amount.toFixed(6)}</span>
                                <span className="ml-2 text-lg text-foreground-muted">STX</span>
                            </div>
                        </div>
                        <div className="mt-2 text-right text-xs text-foreground-subtle">
                            ≈ ${(amount * 0.50).toFixed(2)} USD
                        </div>
                    </div>

                    {/* State-specific content */}
                    {state === 'idle' && (
                        <div className="space-y-4">
                            <p className="text-sm text-foreground-muted">
                                This payment will be processed using the x402 protocol. You'll need to sign the transaction with your Stacks wallet.
                            </p>
                            <button
                                onClick={handlePayment}
                                className="w-full rounded-none bg-accent px-4 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
                            >
                                Pay with Stacks
                            </button>
                        </div>
                    )}

                    {(state === 'initiating' || state === 'signing' || state === 'processing') && (
                        <div className="flex flex-col items-center space-y-4 py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-accent" />
                            <div className="text-center">
                                <p className="font-semibold">
                                    {state === 'initiating' && 'Initiating payment...'}
                                    {state === 'signing' && 'Waiting for signature...'}
                                    {state === 'processing' && 'Processing payment...'}
                                </p>
                                <p className="mt-1 text-sm text-foreground-muted">
                                    {state === 'signing' && 'Please sign the transaction in your wallet'}
                                    {state === 'processing' && 'This may take a few moments'}
                                </p>
                                {txId && (
                                    <a
                                        href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                                    >
                                        View transaction
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {state === 'success' && receipt && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center space-y-3 py-4">
                                <CheckCircle2 className="h-16 w-16 text-success" />
                                <div className="text-center">
                                    <p className="font-semibold text-success">Payment Successful!</p>
                                    <p className="mt-1 text-sm text-foreground-muted">
                                        Your cryptographic receipt has been generated
                                    </p>
                                </div>
                            </div>

                            <div className="glass rounded-none p-4 font-mono text-xs">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-foreground-subtle">Receipt ID</span>
                                        <span className="font-semibold">{receipt.receipt_id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-foreground-subtle">Payment TX</span>
                                        <span className="font-semibold">{receipt.payment_txid.slice(0, 8)}...</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-foreground-subtle">Block Height</span>
                                        <span className="font-semibold">{receipt.block_height}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={downloadPDF}
                                    className="flex-1 rounded-none border border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-background-overlay"
                                >
                                    <Download className="mr-2 inline-block h-4 w-4" />
                                    PDF
                                </button>
                                <button
                                    onClick={downloadCSV}
                                    className="flex-1 rounded-none border border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-background-overlay"
                                >
                                    <Download className="mr-2 inline-block h-4 w-4" />
                                    CSV
                                </button>
                            </div>

                            <a
                                href={`/receipts/${receipt.receipt_id}`}
                                className="block w-full rounded-none bg-accent px-4 py-3 text-center font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
                            >
                                View Receipt Details
                            </a>
                        </div>
                    )}

                    {state === 'error' && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center space-y-3 py-4">
                                <AlertCircle className="h-16 w-16 text-error" />
                                <div className="text-center">
                                    <p className="font-semibold text-error">Payment Failed</p>
                                    <p className="mt-1 text-sm text-foreground-muted">
                                        {error || 'An error occurred during payment'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                className="w-full rounded-none border border bg-background px-4 py-3 font-semibold transition-colors hover:bg-background-overlay"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
