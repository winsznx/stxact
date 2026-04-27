import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundaryFallback } from '../ErrorBoundaryFallback';

describe('ErrorBoundaryFallback', () => {
  it('shows error message', () => {
    render(<ErrorBoundaryFallback error={new Error('oops')} reset={() => {}} />);
    expect(screen.getByText('oops')).toBeInTheDocument();
  });

  it('calls reset on click', () => {
    const reset = vi.fn();
    render(<ErrorBoundaryFallback error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByText('Try again'));
    expect(reset).toHaveBeenCalled();
  });
});
