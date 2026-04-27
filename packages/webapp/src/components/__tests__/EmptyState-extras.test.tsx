import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { Inbox } from 'lucide-react';

describe('EmptyState extras', () => {
  it('renders title and description', () => {
    render(<EmptyState icon={Inbox} title="Nothing here" description="Try filter X" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try filter X')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState icon={Inbox} title="x" description="y" action={<button>do it</button>} />);
    expect(screen.getByText('do it')).toBeInTheDocument();
  });

  it('renders without action', () => {
    const { container } = render(<EmptyState icon={Inbox} title="x" description="y" />);
    expect(container.querySelector('button')).toBeNull();
  });
});
