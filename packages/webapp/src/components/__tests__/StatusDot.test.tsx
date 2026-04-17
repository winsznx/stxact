import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusDot } from '../StatusDot';

describe('StatusDot', () => {
  it('renders without label', () => {
    const { container } = render(<StatusDot status="online" />);
    expect(container.querySelector('.bg-success')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<StatusDot status="pending" label="Processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('applies pulse animation for pending', () => {
    const { container } = render(<StatusDot status="pending" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
