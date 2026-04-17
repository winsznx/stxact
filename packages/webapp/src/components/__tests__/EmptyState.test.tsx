import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { Search } from 'lucide-react';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState icon={Search} title="No items" description="Nothing to show" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });

  it('renders optional action', () => {
    render(
      <EmptyState icon={Search} title="Empty" description="No data" action={<button>Add item</button>} />
    );
    expect(screen.getByText('Add item')).toBeInTheDocument();
  });
});
