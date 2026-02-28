'use client';

import Link from 'next/link';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/navigation';

const WalletButton = dynamic(
  () => import('./WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

interface NavbarProps {
  links?: NavItem[];
  showDesktopLinks?: boolean;
  showWalletButton?: boolean;
}

export function Navbar({
  links = [],
  showDesktopLinks = true,
  showWalletButton = true,
}: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Intentional: Prevents SSR hydration mismatch with theme toggle
    setMounted(true);
  }, []);

  const activeHref = useMemo(() => {
    if (!pathname) return '';
    const sortedLinks = [...links].sort((a, b) => b.href.length - a.href.length);
    const match = sortedLinks.find(
      ({ href }) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
    );
    return match?.href || '';
  }, [links, pathname]);

  const hasMobileMenu = links.length > 0 || showWalletButton;
  const mobileMenuVisibilityClass = showDesktopLinks ? 'md:hidden' : 'lg:hidden';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

          {/* Desktop Navigation */}
          {showDesktopLinks && links.length > 0 && (
            <div className="hidden md:flex md:items-center md:gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
                    activeHref === link.href
                      ? 'border-accent text-foreground'
                      : 'border-transparent text-foreground-muted hover:border-accent/50 hover:text-foreground'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          )}

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
            {showWalletButton && (
              <div className="hidden sm:block">
                <WalletButton />
              </div>
            )}

            {/* Mobile Menu Button - Visible on mobile */}
            {hasMobileMenu && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`rounded-none border border p-2 transition-colors hover:border-accent hover:bg-background-raised ${mobileMenuVisibilityClass}`}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && hasMobileMenu && (
          <div className={`animate-fade-in border-t border py-4 ${mobileMenuVisibilityClass}`}>
            <div className="flex flex-col gap-4">
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-none border px-3 py-2 text-sm font-medium transition-colors ${
                        activeHref === link.href
                          ? 'border-accent bg-background-raised text-foreground'
                          : 'border-transparent text-foreground-muted hover:border-accent/50 hover:bg-background-raised'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}

              {showWalletButton && (
                <div className={links.length > 0 ? 'border-t border pt-4' : ''}>
                  <WalletButton />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
