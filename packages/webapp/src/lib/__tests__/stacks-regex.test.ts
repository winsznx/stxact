import { describe, it, expect } from 'vitest';
import {
  STACKS_ADDRESS_REGEX,
  STACKS_MAINNET_ADDRESS_REGEX,
  STACKS_TESTNET_ADDRESS_REGEX,
} from '../constants';

describe('STACKS_ADDRESS_REGEX', () => {
  const mainnet = 'SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0';
  const testnet = 'ST1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0';
  const multisig = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4';
  const testnetMulti = 'SN1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0';

  it('accepts SP mainnet single-sig', () => {
    expect(STACKS_ADDRESS_REGEX.test(mainnet)).toBe(true);
    expect(STACKS_MAINNET_ADDRESS_REGEX.test(mainnet)).toBe(true);
  });

  it('accepts SM mainnet multi-sig', () => {
    expect(STACKS_MAINNET_ADDRESS_REGEX.test(multisig)).toBe(true);
  });

  it('accepts ST testnet single-sig', () => {
    expect(STACKS_TESTNET_ADDRESS_REGEX.test(testnet)).toBe(true);
  });

  it('accepts SN testnet multi-sig', () => {
    expect(STACKS_TESTNET_ADDRESS_REGEX.test(testnetMulti)).toBe(true);
  });

  it('mainnet regex rejects testnet prefix', () => {
    expect(STACKS_MAINNET_ADDRESS_REGEX.test(testnet)).toBe(false);
  });

  it('testnet regex rejects mainnet prefix', () => {
    expect(STACKS_TESTNET_ADDRESS_REGEX.test(mainnet)).toBe(false);
  });

  it('rejects too-short input', () => {
    expect(STACKS_ADDRESS_REGEX.test('SP123')).toBe(false);
  });

  it('rejects lowercase prefix', () => {
    expect(STACKS_ADDRESS_REGEX.test('sp1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toBe(false);
  });
});
