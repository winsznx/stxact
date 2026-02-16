'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { makeContractCall, broadcastTransaction, AnchorMode, stringAsciiCV, bufferCVFromString, someCV, noneCV, uintCV, TxBroadcastResult } from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';

type RegistrationState = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

interface FormData {
    endpointUrl: string;
    policyHash: string;
    bnsName: string;
    category: string;
    supportedTokens: string[];
    stakeAmount: string;
}

export function RegisterServiceForm() {
    const { address, balance, isConnected } = useWallet();
    const [state, setState] = useState<RegistrationState>('idle');
    const [formData, setFormData] = useState<FormData>({
        endpointUrl: '',
        policyHash: '',
        bnsName: '',
        category: 'data-api',
        supportedTokens: ['STX'],
        stakeAmount: '100',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [txId, setTxId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
    const contractAddress = process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS?.split('.')[0] || '';
    const contractName = process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS?.split('.')[1] || 'service-registry';

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};

        // Validate endpoint URL
        try {
            new URL(formData.endpointUrl);
        } catch {
            newErrors.endpointUrl = 'Invalid URL format';
        }

        // Validate policy hash (should be hex)
        if (!/^[0-9a-fA-F]{64}$/.test(formData.policyHash)) {
            newErrors.policyHash = 'Policy hash must be 64 hex characters';
        }

        // Validate stake amount
        const stake = parseFloat(formData.stakeAmount);
        if (isNaN(stake) || stake < 100) {
            newErrors.stakeAmount = 'Minimum stake is 100 STX';
        }

        // Check balance
        if (balance) {
            const balanceSTX = parseFloat(balance) / 1_000_000;
            if (stake > balanceSTX) {
                newErrors.stakeAmount = `Insufficient balance (${balanceSTX.toFixed(2)} STX available)`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address) {
            setError('Please connect your wallet first');
            return;
        }

        if (!validateForm()) {
            return;
        }

        try {
            setState('validating');
            setError(null);

            // Step 1: Register in backend database
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const backendResponse = await fetch(`${apiUrl}/directory/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    principal: address,
                    bns_name: formData.bnsName || null,
                    endpoint_url: formData.endpointUrl,
                    policy_hash: formData.policyHash,
                    category: formData.category,
                    supported_tokens: formData.supportedTokens.map(symbol => ({ symbol })),
                    stake_amount: parseFloat(formData.stakeAmount) * 1_000_000,
                }),
            });

            if (!backendResponse.ok) {
                const errorData = await backendResponse.json();
                throw new Error(errorData.message || 'Backend registration failed');
            }

            setState('submitting');

            // Step 2: Register on-chain
            // Hash the endpoint URL
            const encoder = new TextEncoder();
            const endpointBytes = encoder.encode(formData.endpointUrl);
            const endpointHashBuffer = await crypto.subtle.digest('SHA-256', endpointBytes);
            const endpointHash = Array.from(new Uint8Array(endpointHashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const policyHashBuffer = Buffer.from(formData.policyHash, 'hex');

            const txOptions = {
                contractAddress,
                contractName,
                functionName: 'register-service',
                functionArgs: [
                    bufferCVFromString(endpointHash),
                    bufferCVFromString(policyHashBuffer.toString('hex')),
                    formData.bnsName ? someCV(stringAsciiCV(formData.bnsName)) : noneCV(),
                    uintCV(parseFloat(formData.stakeAmount) * 1_000_000),
                ],
                senderKey: address, // This will trigger wallet signature
                network,
                anchorMode: AnchorMode.Any,
                fee: BigInt(10000),
            };

            const transaction = await makeContractCall(txOptions);
            const broadcastResponse = await broadcastTransaction({ transaction, network });

            if ('error' in broadcastResponse) {
                const errorResponse = broadcastResponse as { error: string; reason?: string };
                throw new Error(errorResponse.reason || errorResponse.error);
            }

            setTxId(broadcastResponse.txid);
            setState('success');
        } catch (err) {
            console.error('Registration error:', err);
            setError(err instanceof Error ? err.message : 'Registration failed');
            setState('error');
        }
    };

    const handleReset = () => {
        setState('idle');
        setFormData({
            endpointUrl: '',
            policyHash: '',
            bnsName: '',
            category: 'data-api',
            supportedTokens: ['STX'],
            stakeAmount: '100',
        });
        setErrors({});
        setError(null);
        setTxId(null);
    };

    if (!isConnected) {
        return (
            <div className="glass rounded-none p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-warning" />
                <h3 className="mt-4 font-serif text-xl font-semibold">Wallet Not Connected</h3>
                <p className="mt-2 text-foreground-muted">
                    Please connect your Stacks wallet to register a service
                </p>
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className="glass rounded-none p-8">
                <div className="flex flex-col items-center space-y-4">
                    <CheckCircle2 className="h-16 w-16 text-success" />
                    <div className="text-center">
                        <h3 className="font-serif text-2xl font-semibold text-success">
                            Service Registered!
                        </h3>
                        <p className="mt-2 text-foreground-muted">
                            Your service has been successfully registered on-chain
                        </p>
                    </div>

                    {txId && (
                        <a
                            href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                        >
                            View transaction
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    )}

                    <div className="flex gap-3 pt-4">
                        <a
                            href={`/directory/${address}`}
                            className="rounded-none bg-accent px-6 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
                        >
                            View Service
                        </a>
                        <button
                            onClick={handleReset}
                            className="rounded-none border border bg-background px-6 py-3 font-semibold transition-colors hover:bg-background-overlay"
                        >
                            Register Another
                        </button>
                    </div>
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
                        Register your service on the stxact network
                    </p>
                </div>

                {/* Endpoint URL */}
                <div>
                    <label htmlFor="endpointUrl" className="block text-sm font-medium">
                        Service Endpoint URL *
                    </label>
                    <input
                        id="endpointUrl"
                        type="url"
                        value={formData.endpointUrl}
                        onChange={(e) => setFormData({ ...formData, endpointUrl: e.target.value })}
                        className={`mt-1 w-full rounded-none border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${errors.endpointUrl ? 'border-error' : 'border'
                            }`}
                        placeholder="https://api.example.com"
                        disabled={state !== 'idle'}
                    />
                    {errors.endpointUrl && (
                        <p className="mt-1 text-sm text-error">{errors.endpointUrl}</p>
                    )}
                </div>

                {/* Policy Hash */}
                <div>
                    <label htmlFor="policyHash" className="block text-sm font-medium">
                        Policy Hash *
                    </label>
                    <input
                        id="policyHash"
                        type="text"
                        value={formData.policyHash}
                        onChange={(e) => setFormData({ ...formData, policyHash: e.target.value })}
                        className={`mt-1 w-full rounded-none border bg-background px-4 py-2 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${errors.policyHash ? 'border-error' : 'border'
                            }`}
                        placeholder="64 hex characters"
                        maxLength={64}
                        disabled={state !== 'idle'}
                    />
                    {errors.policyHash && (
                        <p className="mt-1 text-sm text-error">{errors.policyHash}</p>
                    )}
                    <p className="mt-1 text-xs text-foreground-subtle">
                        SHA-256 hash of your service policy document
                    </p>
                </div>

                {/* BNS Name (optional) */}
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
                        placeholder="myservice.btc"
                        disabled={state !== 'idle'}
                    />
                </div>

                {/* Category */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium">
                        Category *
                    </label>
                    <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 w-full rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        disabled={state !== 'idle'}
                    >
                        <option value="data-api">Data API</option>
                        <option value="ai-compute">AI Compute</option>
                        <option value="storage">Storage</option>
                        <option value="analytics">Analytics</option>
                        <option value="oracle">Oracle</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                {/* Stake Amount */}
                <div>
                    <label htmlFor="stakeAmount" className="block text-sm font-medium">
                        Stake Amount (STX) *
                    </label>
                    <input
                        id="stakeAmount"
                        type="number"
                        step="0.000001"
                        min="100"
                        value={formData.stakeAmount}
                        onChange={(e) => setFormData({ ...formData, stakeAmount: e.target.value })}
                        className={`mt-1 w-full rounded-none border bg-background px-4 py-2 font-mono transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${errors.stakeAmount ? 'border-error' : 'border'
                            }`}
                        disabled={state !== 'idle'}
                    />
                    {errors.stakeAmount && (
                        <p className="mt-1 text-sm text-error">{errors.stakeAmount}</p>
                    )}
                    <p className="mt-1 text-xs text-foreground-subtle">
                        Minimum: 100 STX. Your stake will be locked in the contract.
                    </p>
                </div>

                {/* Error message */}
                {error && (
                    <div className="rounded-none border border-error bg-error/10 p-4">
                        <p className="text-sm text-error">{error}</p>
                    </div>
                )}

                {/* Submit button */}
                <button
                    type="submit"
                    disabled={state !== 'idle'}
                    className="w-full rounded-none bg-accent px-4 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                    {state === 'idle' && 'Register Service'}
                    {state === 'validating' && (
                        <>
                            <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                            Validating...
                        </>
                    )}
                    {state === 'submitting' && (
                        <>
                            <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                            Submitting Transaction...
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
