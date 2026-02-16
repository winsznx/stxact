import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GlassCard } from '../GlassCard';

describe('GlassCard Component', () => {
  it('should render children correctly', () => {
    const { getByText } = render(
      <GlassCard>
        <div>Test Content</div>
      </GlassCard>
    );

    expect(getByText('Test Content')).toBeDefined();
  });

  it('should apply default variant class', () => {
    const { container } = render(
      <GlassCard>
        <div>Test</div>
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('glass');
  });

  it('should apply strong variant when specified', () => {
    const { container } = render(
      <GlassCard variant="strong">
        <div>Test</div>
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('glass-strong');
  });
});
