import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetworkBadge } from '../NetworkBadge';
import { resetNetworkCache } from '@/lib/network';

describe('NetworkBadge', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('renders mainnet label when env set', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    render(<NetworkBadge />);
    expect(screen.getByText('mainnet')).toBeInTheDocument();
  });

  it('renders testnet label by default', () => {
    render(<NetworkBadge />);
    expect(screen.getByText('testnet')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<NetworkBadge className="custom-cls" />);
    expect(container.firstChild).toHaveClass('custom-cls');
  });
});
