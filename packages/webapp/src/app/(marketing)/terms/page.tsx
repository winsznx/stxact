import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { legalBackLinks } from '@/lib/navigation';

const termsSections = [
  {
    title: 'Service Scope',
    body:
      'stxact provides trust and settlement tooling for x402-enabled services, including receipts, verification interfaces, and dispute workflows.',
  },
  {
    title: 'Operator Responsibility',
    body:
      'Service operators are responsible for accurate policy publication, endpoint reliability, and lawful handling of buyer interactions.',
  },
  {
    title: 'Dispute and Refund Actions',
    body:
      'Dispute outcomes depend on submitted evidence and signed authorization flows. On-chain settlement finality applies where relevant.',
  },
  {
    title: 'Compliance and Recordkeeping',
    body:
      'Users should retain exported audit bundles and ensure operational policies meet applicable legal and accounting requirements.',
  },
];

/**
 * Executes logic associated with terms page.
 */
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border pb-6">
          <h1 className="mb-2 font-serif text-4xl font-bold">Terms of Use</h1>
          <p className="text-sm text-foreground-subtle">Last updated: February 27, 2026</p>
        </header>

        <section className="space-y-4">
          {termsSections.map((section) => (
            <article key={section.title} className="rounded-none border border bg-background-raised p-5">
              <h2 className="mb-2 font-serif text-xl font-semibold">{section.title}</h2>
              <p className="text-sm text-foreground-muted">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-none border border bg-background-raised p-6">
          <h2 className="mb-2 font-serif text-2xl font-semibold">Important Notice</h2>
          <p className="text-sm text-foreground-muted">
            This page is a product-level terms template and should be reviewed by legal counsel before public
            production use.
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
