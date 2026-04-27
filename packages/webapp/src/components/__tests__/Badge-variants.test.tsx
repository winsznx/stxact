import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge variants', () => {
  it('renders default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders success variant with success classes', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    expect(container.firstChild).toHaveClass('text-success');
  });

  it('renders error variant with error classes', () => {
    const { container } = render(<Badge variant="error">Bad</Badge>);
    expect(container.firstChild).toHaveClass('text-error');
  });

  it('renders accent variant with accent classes', () => {
    const { container } = render(<Badge variant="accent">New</Badge>);
    expect(container.firstChild).toHaveClass('text-accent');
  });

  it('passes className through', () => {
    const { container } = render(<Badge className="custom">x</Badge>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
