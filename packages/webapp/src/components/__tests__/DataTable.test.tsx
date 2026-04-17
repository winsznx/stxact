import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../DataTable';

const columns = [{ key: 'name', label: 'Name', render: (item: { id: string; name: string }) => item.name }];

describe('DataTable', () => {
  it('renders data rows', () => {
    render(<DataTable columns={columns} data={[{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]} keyExtractor={(d) => d.id} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows empty message', () => {
    render(<DataTable columns={columns} data={[]} keyExtractor={(d) => d.id} emptyMessage="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });
});
