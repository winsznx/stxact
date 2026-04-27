import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyButton } from '../CopyButton';

describe('CopyButton', () => {
  it('renders Copy label initially', () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<CopyButton value="abc" />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('shows Copied after click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CopyButton value="abc" />);
    await act(async () => {
      fireEvent.click(screen.getByText('Copy'));
    });
    expect(writeText).toHaveBeenCalledWith('abc');
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });
});
