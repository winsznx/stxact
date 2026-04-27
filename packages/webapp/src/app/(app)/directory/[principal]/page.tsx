'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Copy, Check, Shield, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useService } from '@/hooks/useServices';
import { useReceipts } from '@/hooks/useReceipts';
import { useDisputes } from '@/hooks/useDisputes';
import { TrustBadge } from '@/components/TrustBadge';
import { GlassPanel } from '@/components/GlassCard';
import { MetricTile } from '@/components/MetricTile';
import { CodeBlock } from '@/components/CodeBlock';
import { getServiceScore, getServiceTotalVolume } from '@/lib/service-utils';

type TimelinePoint = {
  month: string;
  deliveries: number;
  disputes: number;
};

export default function ServiceDetailPage() {
  const params = useParams();
  const principal = params.principal as string;
  const { data: service, isLoading, error } = useService(principal);
  const { data: receiptsData, isLoading: receiptsLoading } = useReceipts({
    seller_principal: principal,
    limit: 200,
  });
  const { data: disputesData, isLoading: disputesLoading } = useDisputes({
    seller_principal: principal,
    limit: 200,
  });
  const [copied, setCopied] = useState(false);
  const [policyDocument, setPolicyDocument] = useState<Record<string, unknown> | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const copyPrincipal = async () => {
    await navigator.clipboard.writeText(principal);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const loadPolicy = async () => {
      if (!service?.policy_url) {
        setPolicyDocument(null);
        setPolicyError(null);
        return;
      }

      try {
        setPolicyError(null);
        const response = await fetch(service.policy_url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Policy endpoint responded with ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Policy URL did not return JSON');
        }

        const json = (await response.json()) as Record<string, unknown>;
        if (!ignore) {
          setPolicyDocument(json);
        }
      } catch (fetchError) {
        if (!ignore) {
          setPolicyDocument(null);
          setPolicyError(fetchError instanceof Error ? fetchError.message : 'Failed to load policy JSON');
        }
      }
    };

    loadPolicy();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [service?.policy_url]);

  const timeline = useMemo<TimelinePoint[]>(() => {
    const receipts = receiptsData?.receipts || [];
    const disputes = disputesData?.disputes || [];
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`;

      const deliveries = receipts.filter((receipt) => {
        const ts = new Date(receipt.timestamp * 1000);
        return `${ts.getFullYear()}-${ts.getMonth() + 1}` === monthKey;
      }).length;

      const monthlyDisputes = disputes.filter((dispute) => {
        const ts = new Date(dispute.created_at * 1000);
        return `${ts.getFullYear()}-${ts.getMonth() + 1}` === monthKey;
      }).length;

      return {
        month: monthDate.toLocaleDateString(undefined, { month: 'short' }),
        deliveries,
        disputes: monthlyDisputes,
      };
    });
  }, [disputesData?.disputes, receiptsData?.receipts]);

  if (isLoading || receiptsLoading || disputesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="glass h-96 animate-pulse rounded-none" />
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <GlassPanel className="p-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
            <h2 className="mb-2 font-serif text-xl font-semibold">Service Not Found</h2>
            <p className="text-foreground-muted">This service could not be loaded from the directory API.</p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  const score = getServiceScore(service);
  const successRate = service.reputation?.success_rate ?? 1;
  const totalVolume = Number(getServiceTotalVolume(service) || 0);
  const trustLevel: 'anchored' | 'database' | 'risk' =
    score >= 80 ? 'anchored' : score >= 40 ? 'database' : 'risk';

  const usageSnippet = `curl -X GET "${service.endpoint_url}" \\
  -H "Accept: application/json" \\
  -H "X-Idempotency-Key: <uuid>"`;

  const policyFallback = {
    principal: service.principal,
    endpoint_url: service.endpoint_url,
    category: service.category,
    supported_tokens: (service.supported_tokens || []).map((token) => token.symbol),
    policy_hash: service.policy_hash,
    policy_url: service.policy_url,
    generated_from: 'directory-metadata',
    generated_at: new Date().toISOString(),
  };
  const policyPayload = policyDocument || policyFallback;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Link
          href="/directory"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>

        <GlassPanel className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold">{service.bns_name || `${principal.slice(0, 14)}...`}</h1>
              <button
                onClick={copyPrincipal}
                className="mt-2 inline-flex items-center gap-2 font-mono text-xs text-foreground-muted hover:text-accent"
              >
                <span>{principal}</span>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <TrustBadge level={trustLevel} />
                <span className="rounded-none border border px-2 py-0.5 text-xs">{service.category}</span>
              </div>
            </div>

            {service.policy_url && (
              <a
                href={service.policy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-none border border px-3 py-2 text-xs font-medium hover:border-accent hover:bg-background-raised"
              >
                Open Policy URL
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </GlassPanel>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricTile label="Reputation Score" value={score.toString()} />
          <MetricTile label="Success Rate" value={`${(successRate * 100).toFixed(1)}%`} />
          <MetricTile label="Total Volume" value={totalVolume.toLocaleString()} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <GlassPanel>
            <h2 className="mb-4 font-serif text-lg font-semibold">Service Metadata</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-foreground-subtle">Endpoint URL</dt>
                <dd className="font-mono break-all">{service.endpoint_url}</dd>
              </div>
              <div>
                <dt className="text-foreground-subtle">Policy Hash</dt>
                <dd className="font-mono break-all">{service.policy_hash}</dd>
              </div>
              <div>
                <dt className="text-foreground-subtle">Supported Tokens</dt>
                <dd>{(service.supported_tokens || []).map((t) => t.symbol).join(', ') || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-foreground-subtle">Registered At</dt>
                <dd>
                  {typeof service.registered_at === 'number'
                    ? new Date(service.registered_at * 1000).toLocaleString()
                    : new Date(service.registered_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </GlassPanel>

          <GlassPanel>
            <h2 className="mb-4 font-serif text-lg font-semibold">Reputation Graph</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background-overlay)',
                      border: '1px solid var(--border)',
                      borderRadius: '0px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="deliveries" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="disputes" stroke="var(--error)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel>
            <h2 className="mb-4 font-serif text-lg font-semibold">Usage Example</h2>
            <CodeBlock title="HTTP Example" language="bash" code={usageSnippet} />
          </GlassPanel>
        </div>

        <GlassPanel className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-semibold">Service Policy Viewer</h2>
            {policyError && <p className="text-xs text-warning">Using metadata fallback: {policyError}</p>}
          </div>
          <CodeBlock language="json" code={JSON.stringify(policyPayload, null, 2)} />
        </GlassPanel>
      </div>
    </div>
  );
}
