import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard, GlassPanel, GlassTable } from '../GlassCard';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Test content</GlassCard>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { container } = render(<GlassCard variant="strong">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('glass-strong');
  });

  it('applies hover class when enabled', () => {
    const { container } = render(<GlassCard hover>Content</GlassCard>);
    expect(container.firstChild).toHaveClass('transition-all');
  });

  it('accepts custom className', () => {
    const { container } = render(<GlassCard className="mt-4">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});

describe('GlassPanel', () => {
  it('renders with glass-strong class', () => {
    const { container } = render(<GlassPanel>Panel</GlassPanel>);
    expect(container.firstChild).toHaveClass('glass-strong');
  });
});

describe('GlassTable', () => {
  it('renders with overflow wrapper', () => {
    const { container } = render(<GlassTable><table><tbody><tr><td>Cell</td></tr></tbody></table></GlassTable>);
    expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
  });
});
