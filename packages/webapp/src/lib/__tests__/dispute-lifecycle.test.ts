import { describe, it, expect } from 'vitest';
import {
  isTerminalStatus,
  isActiveStatus,
  isRefundedStatus,
  canTransition,
  TERMINAL_STATUSES,
  ACTIVE_STATUSES,
} from '../dispute-lifecycle';

describe('dispute-lifecycle', () => {
  it('classifies terminal statuses', () => {
    expect(TERMINAL_STATUSES).toContain('resolved');
    expect(TERMINAL_STATUSES).toContain('refunded');
    expect(TERMINAL_STATUSES).toContain('rejected');
  });

  it('classifies active statuses', () => {
    expect(ACTIVE_STATUSES).toContain('open');
    expect(ACTIVE_STATUSES).toContain('acknowledged');
  });

  it('isTerminalStatus matches expected', () => {
    expect(isTerminalStatus('refunded')).toBe(true);
    expect(isTerminalStatus('open')).toBe(false);
  });

  it('isActiveStatus matches expected', () => {
    expect(isActiveStatus('open')).toBe(true);
    expect(isActiveStatus('refunded')).toBe(false);
  });

  it('isRefundedStatus matches refunded only', () => {
    expect(isRefundedStatus('refunded')).toBe(true);
    expect(isRefundedStatus('resolved')).toBe(false);
  });

  it('canTransition open -> acknowledged', () => {
    expect(canTransition('open', 'acknowledged')).toBe(true);
  });

  it('canTransition acknowledged -> resolved', () => {
    expect(canTransition('acknowledged', 'resolved')).toBe(true);
  });

  it('rejects transitions out of terminal states', () => {
    expect(canTransition('refunded', 'open')).toBe(false);
    expect(canTransition('rejected', 'resolved')).toBe(false);
  });

  it('rejects same-state transitions', () => {
    expect(canTransition('open', 'open')).toBe(false);
  });

  it('rejects invalid transitions', () => {
    expect(canTransition('open', 'refunded')).toBe(false);
  });
});
