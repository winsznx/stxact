import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Divider } from '../Divider';

describe('Divider variants', () => {
  it('renders solid hr by default', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('applies dashed class when dashed', () => {
    const { container } = render(<Divider variant="dashed" />);
    expect(container.querySelector('hr')?.className).toContain('border-dashed');
  });

  it('renders div for receipt variant', () => {
    const { container } = render(<Divider variant="receipt" />);
    expect(container.querySelector('hr')).toBeNull();
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});
