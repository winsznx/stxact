import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricTile } from '../MetricTile';

describe('MetricTile extras', () => {
  it('renders label and value', () => {
    render(<MetricTile label="Total" value={42} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders change indicator', () => {
    render(<MetricTile label="x" value={1} change={{ value: 5, period: '24h' }} trend="up" />);
    expect(screen.getByText(/\+5%/)).toBeInTheDocument();
    expect(screen.getByText(/24h/)).toBeInTheDocument();
  });

  it('renders negative change without plus sign', () => {
    render(<MetricTile label="x" value={1} change={{ value: -3, period: '24h' }} trend="down" />);
    expect(screen.getByText(/-3%/)).toBeInTheDocument();
  });

  it('renders no change when not provided', () => {
    render(<MetricTile label="x" value={1} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
