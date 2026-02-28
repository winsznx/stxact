import Link from 'next/link';
import { ArrowRight, BookOpen, FileCheck2, Scale, ShieldCheck } from 'lucide-react';
import { docsQuickLinks } from '@/lib/navigation';

const protocolSteps = [
  {
    title: '1. Register Service',
    description:
      'Connect your Stacks wallet, submit endpoint metadata, and publish your service policy hash.',
  },
  {
    title: '2. Receive x402 Payments',
    description:
      'Buyer requests are challenged with payment requirements and retried after transaction confirmation.',
  },
  {
    title: '3. Generate Signed Receipts',
    description:
      'stxact creates a canonical receipt with seller signature, payment context, and optional delivery hash.',
  },
  {
    title: '4. Verify and Resolve',
    description:
      'Receipts can be verified independently. Disputes produce deterministic refund records and audit traces.',
  },
];

const verificationChecks = [
  'Seller signature validity',
  'Principal recovery and match',
  'Payment transaction confirmation',
  'Optional BNS ownership verification',
  'Revision and delivery commitment status',
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border pb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-none border border bg-background-raised px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground-muted">
            <BookOpen className="h-4 w-4 text-accent" />
            Developer Documentation
          </div>
          <h1 className="mb-3 font-serif text-4xl font-bold">stxact Product and Flow Guide</h1>
          <p className="max-w-3xl text-lg text-foreground-muted">
            Integration documentation for service operators, buyers, and auditors using trust receipts on Stacks.
          </p>
        </header>

        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docsQuickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-none border border bg-background-raised p-4 transition-colors hover:border-accent hover:bg-background-overlay"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{link.name}</span>
                <ArrowRight className="h-4 w-4 text-foreground-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="glass-strong rounded-none p-6">
            <h2 className="mb-4 font-serif text-2xl font-semibold">Protocol Workflow</h2>
            <div className="space-y-4">
              {protocolSteps.map((step) => (
                <div key={step.title} className="rounded-none border border bg-background p-4">
                  <h3 className="mb-1 font-semibold">{step.title}</h3>
                  <p className="text-sm text-foreground-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-strong rounded-none p-6">
            <h2 className="mb-4 font-serif text-2xl font-semibold">Receipt Verification Standard</h2>
            <div className="space-y-3">
              {verificationChecks.map((check) => (
                <div key={check} className="flex items-start gap-3 rounded-none border border bg-background p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p className="text-sm">{check}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-foreground-subtle">
              Verify from the product UI or by API endpoint to support institutional audit workflows.
            </p>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-none border border bg-background-raised p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-accent" />
              <h2 className="font-serif text-xl font-semibold">Core HTTP Endpoints</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border text-xs uppercase tracking-wide text-foreground-subtle">
                    <th className="py-2 pr-4">Route</th>
                    <th className="py-2 pr-4">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border/60">
                    <td className="py-2 pr-4 font-mono">/directory</td>
                    <td className="py-2 pr-4 text-foreground-muted">Discover services and reputation</td>
                  </tr>
                  <tr className="border-b border/60">
                    <td className="py-2 pr-4 font-mono">/receipts/:id</td>
                    <td className="py-2 pr-4 text-foreground-muted">Inspect and verify a receipt</td>
                  </tr>
                  <tr className="border-b border/60">
                    <td className="py-2 pr-4 font-mono">/disputes/new</td>
                    <td className="py-2 pr-4 text-foreground-muted">File a structured dispute</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">/audit</td>
                    <td className="py-2 pr-4 text-foreground-muted">Export CSV, JSON, and audit bundles</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-none border border bg-background-raised p-6">
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-accent" />
              <h2 className="font-serif text-xl font-semibold">Operational Guidance</h2>
            </div>
            <div className="space-y-3 text-sm text-foreground-muted">
              <p>Use idempotency keys for paid retries and avoid duplicate charges.</p>
              <p>Anchor high-value receipts on-chain when third-party verification is required.</p>
              <p>Publish service policy updates with stable policy hashes to preserve audit continuity.</p>
              <p>For mainnet workloads, enforce multi-confirmation settlement and signed dispute actions.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
