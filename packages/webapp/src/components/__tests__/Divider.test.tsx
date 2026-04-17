import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Divider } from '../Divider';

describe('Divider', () => {
  it('renders solid hr by default', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('renders dashed variant', () => {
    const { container } = render(<Divider variant="dashed" />);
    expect(container.querySelector('hr')).toHaveClass('border-dashed');
  });

  it('renders receipt variant as div', () => {
    const { container } = render(<Divider variant="receipt" />);
    expect(container.querySelector('hr')).toBeNull();
  });
});
