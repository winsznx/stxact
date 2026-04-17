import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustBadge, TrustBadgeWithTooltip } from '../TrustBadge';

describe('TrustBadge', () => {
  it('renders anchored badge', () => {
    render(<TrustBadge level="anchored" />);
    expect(screen.getByText('Anchored')).toBeInTheDocument();
  });

  it('renders database badge', () => {
    render(<TrustBadge level="database" />);
    expect(screen.getByText('DB-only')).toBeInTheDocument();
  });

  it('renders risk badge', () => {
    render(<TrustBadge level="risk" />);
    expect(screen.getByText('Risk')).toBeInTheDocument();
  });
});

describe('TrustBadgeWithTooltip', () => {
  it('shows tooltip text', () => {
    render(<TrustBadgeWithTooltip level="anchored" />);
    expect(screen.getByText('Institutional-grade')).toBeInTheDocument();
  });
});
