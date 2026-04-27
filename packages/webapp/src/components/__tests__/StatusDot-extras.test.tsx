import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusDot } from '../StatusDot';

describe('StatusDot extras', () => {
  it('renders label when provided', () => {
    render(<StatusDot status="online" label="Live" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('omits label element when not provided', () => {
    const { container } = render(<StatusDot status="online" />);
    expect(container.querySelector('span span:last-child')).toBeNull();
  });

  it('applies pulse class for pending', () => {
    const { container } = render(<StatusDot status="pending" />);
    const dot = container.querySelector('span span') as HTMLElement;
    expect(dot.className).toContain('animate-pulse');
  });
});
