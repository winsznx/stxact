import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricTile } from '../MetricTile';

describe('MetricTile', () => {
  it('renders label and value', () => {
    render(<MetricTile label="Total Volume" value="1,234" />);
    expect(screen.getByText('Total Volume')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('shows change with trend indicator', () => {
    render(<MetricTile label="Score" value={85} change={{ value: 12, period: 'vs last week' }} trend="up" />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });
});
