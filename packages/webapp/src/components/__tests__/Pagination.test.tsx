import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('shows page info', () => {
    render(<Pagination total={100} limit={20} offset={0} onPageChange={() => {}} />);
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('returns null for single page', () => {
    const { container } = render(<Pagination total={5} limit={20} offset={0} onPageChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onPageChange on next', () => {
    const handler = vi.fn();
    render(<Pagination total={100} limit={20} offset={0} onPageChange={handler} />);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(handler).toHaveBeenCalledWith(20);
  });
});
