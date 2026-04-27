import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders title and description', () => {
    render(<PageHeader title="Hello" description="world" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('renders action', () => {
    render(<PageHeader title="x" action={<button>click</button>} />);
    expect(screen.getByText('click')).toBeInTheDocument();
  });

  it('omits description when not given', () => {
    render(<PageHeader title="x" />);
    expect(screen.queryByText('description')).not.toBeInTheDocument();
  });
});
