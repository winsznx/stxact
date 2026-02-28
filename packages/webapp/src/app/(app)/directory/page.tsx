'use client';

import { useMemo, useState } from 'react';
import { Search, Copy, Check, Shield, Coins } from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import Link from 'next/link';
import type { Service, Token } from '@/lib/api';
import { TrustBadge } from '@/components/TrustBadge';
import { EmptyState } from '@/components/EmptyState';
import {
  getServiceDeliveries,
  getServiceDisputes,
  getServiceScore,
  getServiceStakeStx,
  getServiceTotalVolume,
} from '@/lib/service-utils';

type SortKey = 'reputation_desc' | 'deliveries_desc' | 'registered_desc';

export default function DirectoryPage() {
  const [category, setCategory] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [trustFilter, setTrustFilter] = useState<string>('');
  const [minReputationInput, setMinReputationInput] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('reputation_desc');

  const minReputation = Number.isFinite(Number(minReputationInput))
    ? Math.max(0, Number(minReputationInput))
    : 0;

  const { data, isLoading, error } = useServices({
    category: category || undefined,
    token: token || undefined,
    min_reputation: minReputation > 0 ? minReputation : undefined,
    limit: 50,
  });

  const filteredServices = useMemo(() => {
    const services = data?.services || [];

    const filtered = services.filter((service) => {
      const matchesSearch =
        !search ||
        service.principal.toLowerCase().includes(search.toLowerCase()) ||
        service.bns_name?.toLowerCase().includes(search.toLowerCase());

      const score = getServiceScore(service);
      const matchesTrust =
        !trustFilter ||
        (trustFilter === 'anchored' && score >= 80) ||
        (trustFilter === 'database' && score >= 40 && score < 80) ||
        (trustFilter === 'risk' && score < 40);

      return matchesSearch && matchesTrust;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === 'reputation_desc') {
        return getServiceScore(b) - getServiceScore(a);
      }

      if (sortBy === 'deliveries_desc') {
        return getServiceDeliveries(b) - getServiceDeliveries(a);
      }

      const aTs =
        typeof a.registered_at === 'number'
          ? a.registered_at
          : Math.floor(new Date(a.registered_at).getTime() / 1000) || 0;
      const bTs =
        typeof b.registered_at === 'number'
          ? b.registered_at
          : Math.floor(new Date(b.registered_at).getTime() / 1000) || 0;
      return bTs - aTs;
    });

    return sorted;
  }, [data?.services, search, sortBy, trustFilter]);

  const trustCounts = {
    anchored: data?.services.filter((s) => getServiceScore(s) >= 80).length || 0,
    database:
      data?.services.filter((s) => getServiceScore(s) >= 40 && getServiceScore(s) < 80).length || 0,
    risk: data?.services.filter((s) => getServiceScore(s) < 40).length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="mb-3 font-serif text-4xl font-bold">Service Directory</h1>
          <p className="text-lg text-foreground-muted">
            Trust control panel for programmable Bitcoin services
          </p>
        </div>

        {/* Trust Summary */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            onClick={() => setTrustFilter(trustFilter === 'anchored' ? '' : 'anchored')}
            className={`glass rounded-none p-4 text-left transition-all ${
              trustFilter === 'anchored' ? 'border-success' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground-muted">Institutional-Grade</p>
                <p className="mt-1 font-mono text-2xl font-semibold">{trustCounts.anchored}</p>
              </div>
              <Shield className="h-6 w-6 text-success" />
            </div>
          </button>

          <button
            onClick={() => setTrustFilter(trustFilter === 'database' ? '' : 'database')}
            className={`glass rounded-none p-4 text-left transition-all ${
              trustFilter === 'database' ? 'border-warning' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground-muted">Database-Backed</p>
                <p className="mt-1 font-mono text-2xl font-semibold">{trustCounts.database}</p>
              </div>
              <Shield className="h-6 w-6 text-warning" />
            </div>
          </button>

          <button
            onClick={() => setTrustFilter(trustFilter === 'risk' ? '' : 'risk')}
            className={`glass rounded-none p-4 text-left transition-all ${
              trustFilter === 'risk' ? 'border-error' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground-muted">Higher Risk</p>
                <p className="mt-1 font-mono text-2xl font-semibold">{trustCounts.risk}</p>
              </div>
              <Shield className="h-6 w-6 text-error" />
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="glass mb-8 rounded-none p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
              <input
                type="text"
                placeholder="Search principal or BNS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-none border border bg-background px-4 py-2 pl-10 font-mono text-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All Categories</option>
              <option value="data-api">Data APIs</option>
              <option value="ai-compute">AI Compute</option>
              <option value="storage">Storage</option>
              <option value="analytics">Analytics</option>
              <option value="oracle">Oracle</option>
              <option value="yield">Yield</option>
              <option value="other">Other</option>
            </select>

            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All Tokens</option>
              <option value="STX">STX</option>
              <option value="sBTC">sBTC</option>
              <option value="USDCx">USDCx</option>
            </select>

            <input
              type="number"
              min={0}
              value={minReputationInput}
              onChange={(e) => setMinReputationInput(e.target.value)}
              placeholder="Min reputation"
              className="rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-none border border bg-background px-4 py-2 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="reputation_desc">Sort: Reputation</option>
              <option value="deliveries_desc">Sort: Deliveries</option>
              <option value="registered_desc">Sort: Newest</option>
            </select>
          </div>

          <p className="mt-3 text-xs text-foreground-subtle">
            Showing {filteredServices.length} services
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass animate-pulse rounded-none p-6">
                <div className="mb-4 h-12 bg-background-overlay" />
                <div className="mb-2 h-6 bg-background-overlay" />
                <div className="h-4 w-2/3 bg-background-overlay" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <EmptyState
            icon={Shield}
            title="Failed to Load Services"
            description="We couldn't load the service directory. Please try again."
          />
        )}

        {/* Services Grid */}
        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <ServiceCard key={service.principal} service={service} />
            ))}
          </div>
        ) : (
          !isLoading && (
            <EmptyState
              icon={Search}
              title="No Services Found"
              description="Try adjusting your filters or search terms"
            />
          )
        )}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const [copied, setCopied] = useState(false);

  const copyPrincipal = () => {
    navigator.clipboard.writeText(service.principal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTrustLevel = (score: number): 'anchored' | 'database' | 'risk' => {
    if (score >= 80) return 'anchored';
    if (score >= 40) return 'database';
    return 'risk';
  };

  const score = getServiceScore(service);
  const successRate = service.reputation?.success_rate ?? 0;
  const stake = getServiceStakeStx(service);
  const totalVolumeRaw = getServiceTotalVolume(service);
  const totalVolume = Number(totalVolumeRaw || '0');
  const totalDeliveries = getServiceDeliveries(service);
  const totalDisputes = getServiceDisputes(service);

  return (
    <Link href={`/directory/${service.principal}`}>
      <article className="glass group cursor-pointer rounded-none p-6 transition-all hover:glass-elevate">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="mb-1 font-serif text-lg font-semibold transition-colors group-hover:text-accent">
              {service.bns_name || `${service.principal.slice(0, 12)}...`}
            </h3>

            {service.bns_name && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  copyPrincipal();
                }}
                className="flex items-center gap-1 font-mono text-xs text-foreground-subtle hover:text-accent"
              >
                <span>{service.principal.slice(0, 8)}...{service.principal.slice(-6)}</span>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            )}

            <div className="mt-2 inline-flex items-center gap-2 text-xs text-foreground-muted">
              <span className="rounded-none border border px-2 py-0.5">{service.category}</span>
            </div>
          </div>

          <TrustBadge level={getTrustLevel(score)} />
        </div>

        {/* Reputation Score */}
        <div className="mb-4 border-t border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-foreground-muted">Reputation</span>
            <span className="font-mono text-2xl font-bold">{score}</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className={`h-full ${
                score >= 80 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-error'
              }`}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-2 border-t border pt-4 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-foreground-subtle">Success Rate</span>
            <span className="font-semibold">{(successRate * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-subtle">Stake Bonded</span>
            <span className="font-semibold">{stake} STX</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-subtle">Total Volume</span>
            <span className="font-semibold">
              {Number.isFinite(totalVolume) ? totalVolume.toLocaleString() : '0'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-subtle">Deliveries</span>
            <span className="font-semibold">{totalDeliveries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-subtle">Disputes</span>
            <span className="font-semibold">{totalDisputes}</span>
          </div>
        </div>

        {/* Supported Tokens */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border pt-4">
          {service.supported_tokens?.slice(0, 3).map((token: Token, i: number) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-none border border bg-background px-2 py-1 text-xs font-medium"
            >
              <Coins className="h-3 w-3 text-accent" />
              {token.symbol || 'STX'}
            </div>
          ))}
        </div>
      </article>
    </Link>
  );
}
