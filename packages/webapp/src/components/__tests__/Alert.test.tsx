import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Something happened</Alert>);
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Alert title="Warning">Details here</Alert>);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('applies error variant classes', () => {
    const { container } = render(<Alert variant="error">Error!</Alert>);
    expect(container.firstChild).toHaveClass('border-error/30');
  });
});
