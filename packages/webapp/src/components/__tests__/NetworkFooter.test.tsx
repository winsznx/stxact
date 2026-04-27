import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetworkFooter } from '../NetworkFooter';
import { resetNetworkCache } from '@/lib/network';

describe('NetworkFooter', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('shows current network text', () => {
    render(<NetworkFooter />);
    expect(screen.getByText(/testnet/)).toBeInTheDocument();
  });

  it('shows mainnet network when set', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    render(<NetworkFooter />);
    expect(screen.getByText(/mainnet/)).toBeInTheDocument();
  });
});
