'use client';

import Link from 'next/link';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const WalletButton = dynamic(
  () => import('./WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Intentional: Prevents SSR hydration mismatch with theme toggle
    setMounted(true);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Receipt Stamp Style */}
          <Link href="/" className="group flex items-center gap-2">
            <div className="relative">
              <div className="h-8 w-8 border-2 border-foreground bg-background-raised transition-transform group-hover:rotate-2" />
              <div className="absolute -right-1 -top-1 h-3 w-3 bg-accent transition-all group-hover:scale-110" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight">
              stxact
            </span>
          </Link>

          {/* Desktop Navigation - Removed (Redundant with Sidebar) */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {/* Space reserved for future breadcrumbs or title */}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle - Sharp Corners */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-none border border p-2 transition-colors hover:border-accent hover:bg-background-raised"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Wallet Button - Visible on desktop/tablet */}
            <div className="hidden sm:block">
              <WalletButton />
            </div>

            {/* Mobile Menu Button - Visible on mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-none border border p-2 transition-colors hover:border-accent hover:bg-background-raised sm:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Contains only Wallet Button now */}
        {mobileMenuOpen && (
          <div className="animate-fade-in border-t border py-4 sm:hidden">
            <div className="flex flex-col gap-4">
              <div className="border-t border pt-4">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
