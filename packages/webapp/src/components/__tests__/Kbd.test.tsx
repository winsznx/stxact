import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kbd } from '../Kbd';

describe('Kbd', () => {
  it('renders children inside <kbd>', () => {
    const { container } = render(<Kbd>⌘K</Kbd>);
    expect(container.querySelector('kbd')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('passes className', () => {
    const { container } = render(<Kbd className="custom">x</Kbd>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
