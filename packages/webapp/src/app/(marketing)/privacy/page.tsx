import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { legalBackLinks } from '@/lib/navigation';

const dataPoints = [
  {
    title: 'Wallet Identity',
    detail:
      'Connected wallet principal may be used to query services, receipts, disputes, and audit data relevant to your account.',
  },
  {
    title: 'Receipt Metadata',
    detail:
      'Receipt fields such as payment transaction ID, seller principal, and timestamps are handled for verification and compliance workflows.',
  },
  {
    title: 'Dispute Evidence',
    detail:
      'Dispute submissions may include notes and hash evidence to support deterministic resolution and refund authorization.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border pb-6">
          <h1 className="mb-2 font-serif text-4xl font-bold">Privacy Notice</h1>
          <p className="text-sm text-foreground-subtle">Last updated: February 27, 2026</p>
        </header>

        <section className="space-y-4">
          {dataPoints.map((point) => (
            <article key={point.title} className="rounded-none border border bg-background-raised p-5">
              <h2 className="mb-2 font-serif text-xl font-semibold">{point.title}</h2>
              <p className="text-sm text-foreground-muted">{point.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-none border border bg-background-raised p-6">
          <h2 className="mb-2 font-serif text-2xl font-semibold">Data Handling Principles</h2>
          <p className="mb-3 text-sm text-foreground-muted">
            stxact is designed to preserve verifiability while minimizing unnecessary personal data collection.
          </p>
          <p className="text-sm text-foreground-muted">
            For formal legal review, align this notice with your deployment jurisdiction and compliance policy before
            production rollout.
          </p>
        </section>

        <nav className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {legalBackLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-none border border bg-background-raised px-4 py-3 text-sm font-medium transition-colors hover:border-accent hover:bg-background-overlay"
            >
              {link.name}
              <ArrowRight className="h-4 w-4 text-foreground-subtle group-hover:text-accent" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
