import { ALLOWED_DISPUTE_REASONS, isValidDisputeReason } from '../config/dispute-reasons';

describe('dispute reasons', () => {
  it('includes expected reasons', () => {
    expect(ALLOWED_DISPUTE_REASONS).toContain('delivery_hash_mismatch');
    expect(ALLOWED_DISPUTE_REASONS).toContain('no_response');
    expect(ALLOWED_DISPUTE_REASONS.length).toBe(4);
  });

  it('validates known reasons', () => {
    expect(isValidDisputeReason('no_response')).toBe(true);
  });

  it('rejects unknown reasons', () => {
    expect(isValidDisputeReason('i_changed_my_mind')).toBe(false);
  });
});
