'use client';

import Link from 'next/link';
import { FileCheck, Shield, Scale, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ReceiptStack } from '@/components/ReceiptStack';
import { footerLegalLinks, footerResourceLinks } from '@/lib/navigation';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Receipt Paper Aesthetic */}
      <section className="relative border-b border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Value Prop */}
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-none border border bg-background-raised px-3 py-1.5 text-sm font-medium">
                <div className="h-2 w-2 bg-accent" />
                Cryptographic Proof of Payment
              </div>

              <h1 className="mb-6 font-serif text-5xl font-bold leading-tight tracking-tight lg:text-6xl">
                Trust control panel for programmable Bitcoin
              </h1>

              <p className="mb-8 text-lg text-foreground-muted">
                Cryptographic receipts + delivery proofs + deterministic dispute rails on Stacks
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/directory"
                  className="inline-flex items-center justify-center gap-2 rounded-none border-2 border-foreground bg-accent px-6 py-3 font-semibold text-accent-contrast transition-all hover:bg-accent-hover"
                >
                  Explore Services
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <Link
                  href="/receipts"
                  className="inline-flex items-center justify-center gap-2 rounded-none border-2 border bg-background px-6 py-3 font-semibold transition-colors hover:border-accent hover:bg-background-raised"
                >
                  Verify Receipt
                </Link>
              </div>
            </div>

            {/* Right: Receipt Stack Visual */}
            <div className="flex items-center justify-center">
              <ReceiptStack />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Timeline */}
      <section className="border-b border bg-background-raised py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center font-serif text-4xl font-bold">
            Payment to Proof
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <TimelineStep
              number={1}
              title="Request → 402"
              description="Service returns 402 payment-required with Stacks address and price."
            />
            <TimelineStep
              number={2}
              title="Pay → Deliver"
              description="You pay on-chain. Service delivers. stxact generates signed receipt."
            />
            <TimelineStep
              number={3}
              title="Verify → Dispute"
              description="Receipt proves payment occurred. File disputes if needed. Reputation updates."
            />
          </div>
        </div>
      </section>

      {/* What a Receipt Proves */}
      <section className="border-b border bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 font-serif text-4xl font-bold">
                What a receipt proves
              </h2>
              <p className="mb-8 text-lg text-foreground-muted">
                Every stxact receipt contains 15 canonical fields, cryptographically signed by the seller.
              </p>

              <div className="space-y-4">
                <ProofPoint
                  title="Payment transaction ID"
                  description="On-chain proof of payment with block hash and height"
                />
                <ProofPoint
                  title="Request hash"
                  description="SHA-256 of the original API request (method, path, body, timestamp)"
                />
                <ProofPoint
                  title="Delivery commitment"
                  description="Hash of what was delivered (proves service fulfillment)"
                />
                <ProofPoint
                  title="ECDSA signature"
                  description="Seller's cryptographic signature over all fields"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-none border border bg-background-raised p-8">
              <div className="mb-4 font-mono text-sm text-foreground-muted">
                Receipt Format (Canonical)
              </div>
              <pre className="overflow-x-auto text-xs leading-relaxed text-foreground">
                {`STXACT-RECEIPT:
  receipt_id
  request_hash
  payment_txid
  seller_principal
  buyer_principal
  delivery_commitment
  timestamp
  block_height
  block_hash
  key_version
  revision
  service_policy_hash
  signature`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-b border bg-background-raised py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-serif text-4xl font-bold">
              Trust infrastructure for x402
            </h2>
            <p className="text-lg text-foreground-muted">
              Production-grade settlement layer for payment-required services
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<FileCheck className="h-8 w-8" />}
              title="Cryptographic Receipts"
              description="ECDSA-signed delivery proofs with request hash binding and on-chain anchoring"
            />
            <FeatureCard
              icon={<Scale className="h-8 w-8" />}
              title="Dispute Resolution"
              description="Deterministic refund rails with on-chain execution and state machine validation"
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Portable Reputation"
              description="Logarithmic scoring system anchored to Stacks principals, resistant to farming"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 font-serif text-lg font-semibold">stxact</div>
              <p className="text-sm text-foreground-muted">
                Cryptographic receipts for Web3 payments on Stacks
              </p>
            </div>

            <div>
              <div className="mb-4 text-sm font-semibold">Product</div>
              <div className="space-y-2 text-sm text-foreground-muted">
                <div>
                  <Link href="/directory" className="hover:text-foreground">
                    Directory
                  </Link>
                </div>
                <div>
                  <Link href="/receipts" className="hover:text-foreground">
                    Receipts
                  </Link>
                </div>
                <div>
                  <Link href="/disputes" className="hover:text-foreground">
                    Disputes
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 text-sm font-semibold">Resources</div>
              <div className="space-y-2 text-sm text-foreground-muted">
                {footerResourceLinks.map((link) => (
                  <div key={link.href}>
                    <Link href={link.href} className="hover:text-foreground">
                      {link.name}
                    </Link>
                  </div>
                ))}
                <div>
                  <a href="https://github.com/winsznx/stxact" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                    GitHub
                  </a>
                </div>
                <div>
                  <a href="https://x.com/stxact" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                    Twitter
                  </a>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 text-sm font-semibold">Legal</div>
              <div className="space-y-2 text-sm text-foreground-muted">
                {footerLegalLinks.map((link) => (
                  <div key={link.href}>
                    <Link href={link.href} className="hover:text-foreground">
                      {link.name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border pt-8 text-center text-sm text-foreground-subtle">
            © 2026 stxact. Built on Stacks blockchain.
          </div>
        </div>
      </footer>
    </div>
  );
}

function TimelineStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-none border-2 border bg-background transition-colors group-hover:border-accent">
        <span className="font-serif text-xl font-bold">{number}</span>
      </div>
      <h3 className="mb-2 font-serif text-xl font-semibold">{title}</h3>
      <p className="text-foreground-muted">{description}</p>
    </div>
  );
}

function ProofPoint({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2 w-2 bg-accent flex-shrink-0" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-foreground-muted">{description}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-none border border bg-background p-6 transition-colors hover:border-accent">
      <div className="mb-4 text-accent">{icon}</div>
      <h3 className="mb-2 font-serif text-xl font-semibold">{title}</h3>
      <p className="text-foreground-muted">{description}</p>
    </div>
  );
}
