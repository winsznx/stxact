import Link from 'next/link';
import { Lock, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { legalBackLinks } from '@/lib/navigation';

const controls = [
  {
    title: 'Signed Receipts',
    detail: 'Receipts are signed and validated against seller identity to prevent tampering.',
    icon: ShieldCheck,
  },
  {
    title: 'Dispute Authorization',
    detail: 'Refund actions require canonical message signing to preserve non-repudiation.',
    icon: KeyRound,
  },
  {
    title: 'Audit Exports',
    detail: 'CSV/JSON/bundle exports include timestamps and verification context for compliance review.',
    icon: Lock,
  },
];

/**
 * Executes logic associated with security page.
 */
export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border pb-8">
          <h1 className="mb-3 font-serif text-4xl font-bold">Security and Trust Controls</h1>
          <p className="max-w-3xl text-lg text-foreground-muted">
            stxact combines cryptographic receipts, deterministic dispute rails, and exportable audit records for
            accountable service execution.
          </p>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {controls.map((control) => (
            <div key={control.title} className="glass-strong rounded-none p-5">
              <control.icon className="mb-3 h-5 w-5 text-accent" />
              <h2 className="mb-2 font-serif text-xl font-semibold">{control.title}</h2>
              <p className="text-sm text-foreground-muted">{control.detail}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-none border border bg-background-raised p-6">
          <h2 className="mb-3 font-serif text-2xl font-semibold">Operational Security Baseline</h2>
          <div className="grid grid-cols-1 gap-4 text-sm text-foreground-muted md:grid-cols-2">
            <p>Maintain wallet key custody with hardware-backed or institutional signer controls.</p>
            <p>Use TLS for all service endpoints and rotate compromised keys immediately.</p>
            <p>Monitor receipt verification failures and investigate principal mismatches without delay.</p>
            <p>Run pre-mainnet penetration testing and third-party review before handling production treasury flows.</p>
          </div>
        </section>

        <section className="rounded-none border border bg-background-raised p-6">
          <h2 className="mb-3 font-serif text-2xl font-semibold">Related Pages</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {legalBackLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center justify-between rounded-none border border bg-background px-4 py-3 text-sm font-medium transition-colors hover:border-accent hover:bg-background-overlay"
              >
                {link.name}
                <ArrowRight className="h-4 w-4 text-foreground-subtle group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
