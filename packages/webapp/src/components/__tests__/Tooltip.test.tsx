import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('renders children', () => {
    render(<Tooltip content="hint"><span>hover me</span></Tooltip>);
    expect(screen.getByText('hover me')).toBeInTheDocument();
  });

  it('renders content', () => {
    render(<Tooltip content="hint"><span>x</span></Tooltip>);
    expect(screen.getByText('hint')).toBeInTheDocument();
  });

  it('uses top position by default', () => {
    const { container } = render(<Tooltip content="hint"><span>x</span></Tooltip>);
    const popup = container.querySelector('div div');
    expect(popup?.className).toContain('mb-2');
  });

  it('uses bottom position when set', () => {
    const { container } = render(<Tooltip content="hint" position="bottom"><span>x</span></Tooltip>);
    const popup = container.querySelector('div div');
    expect(popup?.className).toContain('mt-2');
  });
});
