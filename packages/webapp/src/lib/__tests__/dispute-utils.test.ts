import { describe, it, expect } from 'vitest';
import { getDisputeStatusVariant, getDisputeStatusLabel } from '../dispute-utils';

describe('getDisputeStatusVariant', () => {
  it('maps open to warning', () => { expect(getDisputeStatusVariant('open')).toBe('warning'); });
  it('maps resolved to success', () => { expect(getDisputeStatusVariant('resolved')).toBe('success'); });
  it('maps rejected to error', () => { expect(getDisputeStatusVariant('rejected')).toBe('error'); });
});

describe('getDisputeStatusLabel', () => {
  it('capitalizes status', () => {
    expect(getDisputeStatusLabel('open')).toBe('Open');
    expect(getDisputeStatusLabel('acknowledged')).toBe('Acknowledged');
  });
});
