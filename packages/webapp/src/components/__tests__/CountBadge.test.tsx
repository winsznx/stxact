import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountBadge } from '../CountBadge';

describe('CountBadge', () => {
  it('renders count', () => {
    render(<CountBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
  it('shows 99+ for large counts', () => {
    render(<CountBadge count={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
  it('returns null for zero', () => {
    const { container } = render(<CountBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });
});
