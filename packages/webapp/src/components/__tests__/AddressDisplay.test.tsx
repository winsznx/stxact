import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AddressDisplay } from '../AddressDisplay';

describe('AddressDisplay', () => {
  it('truncates long addresses', () => {
    render(<AddressDisplay address="SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0" copyable={false} />);
    expect(screen.getByText(/SP1FP8\.\.\./)).toBeInTheDocument();
  });

  it('shows copy button by default', () => {
    const { container } = render(<AddressDisplay address="SP1ABC" />);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('hides copy when copyable=false', () => {
    const { container } = render(<AddressDisplay address="SP1ABC" copyable={false} />);
    expect(container.querySelector('button')).toBeNull();
  });
});
