import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders label', () => {
    render(<Chip label="STX" />);
    expect(screen.getByText('STX')).toBeInTheDocument();
  });
  it('calls onRemove', () => {
    const handler = vi.fn();
    render(<Chip label="STX" onRemove={handler} />);
    fireEvent.click(screen.getByLabelText('Remove STX'));
    expect(handler).toHaveBeenCalledOnce();
  });
});
