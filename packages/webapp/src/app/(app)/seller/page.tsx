'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  RotateCcw,
  Clock,
  CheckCircle2,
  ExternalLink,
  Settings,
  Plus,
  BarChart3,
  Users,
  Package,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCcw,
  Star,
  RefreshCw,
  Lock,
  DollarSign,
  TrendingUp,
  FileCheck,
  Key
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useService } from '@/hooks/useService';
import { useReceipts } from '@/hooks/useReceipts';
import { useDisputes } from '@/hooks/useDisputes';
import { GlassPanel } from '@/components/GlassCard';
import { MetricTile } from '@/components/MetricTile';
import Link from 'next/link';

// Stacks Transactions
import { openContractCall } from '@stacks/connect-react';
import {
  noneCV,
  someCV,
  bufferCV,
  uintCV,
  stringAsciiCV,
  standardPrincipalCV,
  PostConditionMode
} from '@stacks/transactions';

// Manual network definition to avoid import issues
const STACKS_TESTNET = {
  url: 'https://api.testnet.hiro.so',
  chainId: 2147483648 // ChainID.Testnet
};

// Constants
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SERVICE_REGISTRY?.split('.')[0] || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = process.env.NEXT_PUBLIC_SERVICE_REGISTRY?.split('.')[1] || 'service-registry';

const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_MAP?.split('.')[0] || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const REPUTATION_NAME = process.env.NEXT_PUBLIC_REPUTATION_MAP?.split('.')[1] || 'reputation-map';

export default function SellerDashboard() {
  const { address: walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  // Real Data Hooks
  const { data: serviceData, isLoading: isServiceLoading, refetch: refetchService } = useService(walletAddress);
  const { data: receiptsData } = useReceipts({ seller_principal: walletAddress || undefined });
  const { data: disputesData } = useDisputes({ seller_principal: walletAddress || undefined });

  // Local State
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  // Helper to generate 32-byte buffer
  const generateRandomHash = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytes;
  };

  // Metrics (Real)
  const totalReceipts = receiptsData?.receipts.length || 0;
  const completedReceipts = receiptsData?.receipts.filter((r) => r.revision === 1).length || 0;
  const pendingReceipts = totalReceipts - completedReceipts;
  const openDisputes = disputesData?.disputes.filter((d) => d.status === 'open').length || 0;
  const totalDisputes = disputesData?.disputes.length || 0;
  const successRate = totalReceipts > 0 ? ((totalReceipts - totalDisputes) / totalReceipts) * 100 : 100;
  const totalRevenue = '0.00'; // Placeholder as reputationData is removed
  const reputation = 0; // Placeholder as reputationData is removed

  // On-chain Service Data
  const keyVersion = serviceData ? 1 : 0; // Simplified for MVP (real versioning in upgraded contracts)
  const stakeBonded = serviceData?.stake_amount || 0; // Real from chain
  const policyHash = serviceData?.policy_hash || 'Not Set';
  const lastUpdated = serviceData?.updated_at || Date.now();
  const anchorStatus = serviceData?.active ? 'active' : 'inactive';

  // Actions
  const handleRegisterService = () => {
    setLoading(prev => ({ ...prev, 'register': true }));

    const endpointHash = generateRandomHash();
    const policyHash = generateRandomHash();
    const stakeAmount = 100 * 1_000_000; // 100 STX in microSTX

    openContractCall({
      network: STACKS_TESTNET,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'register-service',
      functionArgs: [
        bufferCV(endpointHash),
        bufferCV(policyHash),
        noneCV(), // bns-name optional
        uintCV(stakeAmount)
      ],
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        console.log('Register Service TX:', data.txId);
        setIsRegistering(true); // Optimistic UI update
        setLoading(prev => ({ ...prev, 'register': false }));
      },
      onCancel: () => {
        setLoading(prev => ({ ...prev, 'register': false }));
      }
    });
  };

  const handleRotateKey = () => {
    setLoading(prev => ({ ...prev, 'rotate': true }));
    // Generate a dummy 33-byte public key (compressed)
    const newPubKey = new Uint8Array(33);
    newPubKey[0] = 0x02; // Compressed prefix
    crypto.getRandomValues(newPubKey.subarray(1));

    openContractCall({
      network: STACKS_TESTNET,
      contractAddress: REPUTATION_ADDRESS,
      contractName: REPUTATION_NAME,
      functionName: 'rotate-signing-key',
      functionArgs: [
        bufferCV(newPubKey)
      ],
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        console.log('Key Rotation TX:', data.txId);
        setLoading(prev => ({ ...prev, 'rotate': false }));
      },
      onCancel: () => {
        setLoading(prev => ({ ...prev, 'rotate': false }));
      }
    });
  };

  const handleUpdatePolicy = () => {
    setLoading(prev => ({ ...prev, 'policy': true }));
    const newPolicyHash = generateRandomHash();

    openContractCall({
      network: STACKS_TESTNET,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'update-service',
      functionArgs: [
        noneCV(),
        someCV(bufferCV(newPolicyHash)),
        noneCV()
      ],
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        setLoading(prev => ({ ...prev, 'policy': false }));
      },
      onCancel: () => {
        setLoading(prev => ({ ...prev, 'policy': false }));
      }
    });
  };

  const handleIncreaseStake = async () => {
    // Contract upgrade needed for this feature
    alert("Increasing stake requires undelegating and re-registering in current contract version.");
  };

  // Loading State
  if (isServiceLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Registration View (The "Means to Interact")
  if (!serviceData && !isRegistering) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="mx-auto h-16 w-16 text-accent mb-6" />
            <h1 className="mb-4 font-serif text-4xl font-bold">Become a Verified Service</h1>
            <p className="mb-8 text-lg text-foreground-muted">
              To access the Seller Dashboard and start issuing receipts, you must register your service on-chain.
              This requires bonding 100 STX to establish trust.
            </p>

            <GlassPanel className="p-8">
              <h3 className="mb-4 text-xl font-semibold">Registration Requirements</h3>
              <ul className="mb-8 space-y-3 text-left">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>100 STX minimum stake (recoverable)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>Service Policy Hash (SHA-256)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>Public Endpoint Hash</span>
                </li>
              </ul>

              <button
                onClick={handleRegisterService}
                disabled={loading['register']}
                className="w-full flex items-center justify-center gap-2 rounded-none bg-accent hover:bg-accent/90 text-accent-contrast px-6 py-4 text-lg font-bold transition-colors disabled:opacity-50"
              >
                {loading['register'] ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                {loading['register'] ? 'Broadcasting...' : 'Register & Bond 100 STX'}
              </button>
            </GlassPanel>
          </div>
        </div>
      </div>
    );
  }

  // Pending State
  if (isRegistering && !serviceData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <h2 className="text-xl font-bold">Registration Pending...</h2>
        <p className="text-foreground-muted">Waiting for block confirmation. Your dashboard will appear shortly.</p>
      </div>
    );
  }

  // Main Dashboard (Registered)
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-4xl font-bold">Seller Dashboard</h1>
            <div className="px-2 py-1 rounded bg-success/10 text-success text-xs font-bold border border-success">
              VERIFIED
            </div>
          </div>
          <p className="text-lg text-foreground-muted">
            Service performance • On-chain analytics • Power panel
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 border-b border">
          {[
            { id: 'overview', label: 'Overview & Analytics' },
            { id: 'settings', label: 'Service Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MetricTile
                label="Revenue"
                value={`$${totalRevenue}M`}
                icon={DollarSign}
                change={{ value: 12.5, period: 'vs last month' }}
                trend="up"
              />
              <MetricTile
                label="Success Rate"
                value={`${successRate.toFixed(1)}%`}
                icon={CheckCircle2}
              />
              <MetricTile
                label="Disputes"
                value={totalDisputes.toString()}
                icon={AlertCircle}
                change={{ value: -25, period: 'vs last month' }}
                trend="up"
              />
              <MetricTile
                label="Reputation Score"
                value={serviceData?.reputation_score?.toString() || '0'}
                icon={Activity}
              />
              <MetricTile
                label="Key Version"
                value={`v${serviceData?.key_version || 1}`}
                icon={RotateCcw}
              />
              <MetricTile
                label="Stake Bonded"
                value={`${stakeBonded} STX`}
                icon={Shield}
              />
              <MetricTile
                label="Pending"
                value={pendingReceipts.toString()}
                icon={Clock}
              />
            </div>

            {/* Revenue Chart */}
            <GlassPanel>
              <h3 className="mb-4 font-serif text-lg font-semibold">Revenue Over Time</h3>
              <div className="flex h-64 items-center justify-center border border">
                <div className="text-center">
                  <TrendingUp className="mx-auto mb-2 h-12 w-12 text-foreground-subtle" />
                  <p className="text-sm text-foreground-muted">
                    Chart: Revenue, deliveries, disputes over time
                  </p>
                </div>
              </div>
            </GlassPanel>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GlassPanel>
                <h3 className="mb-4 font-serif text-lg font-semibold">Payment Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border pb-2">
                    <span className="text-sm text-foreground-muted">Completed Deliveries</span>
                    <span className="font-mono font-semibold">{completedReceipts}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border pb-2">
                    <span className="text-sm text-foreground-muted">Pending Deliveries</span>
                    <span className="font-mono font-semibold">{pendingReceipts}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border pb-2">
                    <span className="text-sm text-foreground-muted">Total Receipts</span>
                    <span className="font-mono font-semibold">{totalReceipts}</span>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel>
                <h3 className="mb-4 font-serif text-lg font-semibold">Recent Activity</h3>
                <div className="space-y-3">
                  {receiptsData?.receipts.slice(0, 5).map((receipt, index) => (
                    <Link
                      key={receipt.receipt_id}
                      href={`/receipts/${receipt.receipt_id}`}
                      className="flex items-center justify-between border-b border pb-2 transition-colors hover:bg-background-raised/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-4 w-4" />
                        <div>
                          <p className="font-mono text-xs">{receipt.receipt_id.slice(0, 12)}...</p>
                        </div>
                      </div>
                    </Link>
                  )) || (
                      <p className="py-8 text-center text-sm text-foreground-muted">
                        No recent receipts
                      </p>
                    )}
                </div>
              </GlassPanel>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* Service Identity */}
            <GlassPanel>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 font-serif text-lg font-semibold">Service Identity</h3>
                  <p className="text-xs text-foreground-muted">On-chain service configuration</p>
                </div>
                <div className="rounded-none border border-success bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  ✓ {anchorStatus.toUpperCase()}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-subtle">
                    Principal Address
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-none border border bg-background px-3 py-2 font-mono text-xs">
                      {walletAddress || 'SP31DA...'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-subtle">
                      Current Key Version
                    </label>
                    <div className="rounded-none border border bg-background px-3 py-2 font-mono text-xs">
                      v{serviceData?.key_version || 1}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-subtle">
                      Stake Bonded
                    </label>
                    <div className="rounded-none border border bg-background px-3 py-2 font-mono text-xs">
                      {stakeBonded} STX
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Service Policy */}
            <GlassPanel>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 font-serif text-lg font-semibold">Service Policy</h3>
                  <p className="text-xs text-foreground-muted">
                    On-chain policy hash
                  </p>
                </div>
                <button
                  onClick={handleUpdatePolicy}
                  disabled={loading['policy']}
                  className="flex items-center gap-2 rounded-none border border px-3 py-1 text-xs font-medium transition-colors hover:bg-background-raised disabled:opacity-50"
                >
                  {loading['policy'] ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  {loading['policy'] ? 'Updating...' : 'Update Policy'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-subtle">
                    Policy Hash (SHA-256)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-none border border bg-background px-3 py-2 font-mono text-xs overflow-hidden text-ellipsis">
                      {policyHash}
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Key Management */}
            <GlassPanel>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 font-serif text-lg font-semibold">Key Management</h3>
                  <p className="text-xs text-foreground-muted">
                    Cryptographic key rotation
                  </p>
                </div>
                <button
                  onClick={handleRotateKey}
                  disabled={loading['rotate']}
                  className="flex items-center gap-2 rounded-none border border px-3 py-1 text-xs font-medium transition-colors hover:bg-background-raised disabled:opacity-50"
                >
                  {loading['rotate'] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />}
                  {loading['rotate'] ? 'Rotating...' : 'Rotate Key'}
                </button>
              </div>
            </GlassPanel>

            {/* Stake Management */}
            <GlassPanel>
              <div className="mb-6">
                <h3 className="mb-1 font-serif text-lg font-semibold">Stake Management</h3>
                <p className="text-xs text-foreground-muted">
                  Bonded Amount: {stakeBonded} STX
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleIncreaseStake}
                  className="flex-1 flex items-center justify-center gap-2 rounded-none border border px-4 py-2 text-sm font-medium transition-colors hover:bg-background-raised">
                  <Plus className="h-3 w-3" />
                  Increase Stake
                </button>
              </div>
            </GlassPanel>
          </div>
        )}
      </div>
    </div>
  );
}
