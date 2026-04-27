import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvironmentWarning } from '../EnvironmentWarning';
import { resetNetworkCache } from '@/lib/network';

describe('EnvironmentWarning', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('renders banner on testnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    render(<EnvironmentWarning />);
    expect(screen.getByText(/Stacks testnet/)).toBeInTheDocument();
  });

  it('renders nothing on mainnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    const { container } = render(<EnvironmentWarning />);
    expect(container).toBeEmptyDOMElement();
  });
});
