import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders label and percentage', () => {
    render(<ProgressBar value={75} label="Completion" />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
  it('clamps to 100%', () => {
    render(<ProgressBar value={150} label="Over" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
