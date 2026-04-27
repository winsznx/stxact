import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExternalLink } from '../ExternalLink';

describe('ExternalLink', () => {
  it('opens in new tab with safe rel', () => {
    render(<ExternalLink href="https://x.com">link</ExternalLink>);
    const link = screen.getByText('link').closest('a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows icon by default', () => {
    const { container } = render(<ExternalLink href="https://x.com">link</ExternalLink>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('hides icon when showIcon false', () => {
    const { container } = render(<ExternalLink href="https://x.com" showIcon={false}>link</ExternalLink>);
    expect(container.querySelector('svg')).toBeNull();
  });
});
