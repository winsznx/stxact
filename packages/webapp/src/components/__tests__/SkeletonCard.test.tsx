import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard, SkeletonTable, SkeletonStat } from '../SkeletonCard';

describe('Skeleton variants', () => {
  it('SkeletonCard renders with pulse class', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('SkeletonTable renders 5 placeholder rows', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelectorAll('div.flex').length).toBe(5);
  });

  it('SkeletonStat renders pulse container', () => {
    const { container } = render(<SkeletonStat />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});
