import { stripHexPrefix, ensureHexPrefix, isHexString, bytesToHex, hexToBytes } from '../../src/utils/hex';

describe('hex utils', () => {
  it('stripHexPrefix removes 0x', () => {
    expect(stripHexPrefix('0xabc')).toBe('abc');
    expect(stripHexPrefix('abc')).toBe('abc');
  });

  it('ensureHexPrefix adds 0x', () => {
    expect(ensureHexPrefix('abc')).toBe('0xabc');
    expect(ensureHexPrefix('0xabc')).toBe('0xabc');
  });

  it('isHexString validates both prefixed and bare hex', () => {
    expect(isHexString('0xabc')).toBe(true);
    expect(isHexString('abc')).toBe(true);
    expect(isHexString('xyz')).toBe(false);
  });

  it('bytesToHex converts Uint8Array to hex string', () => {
    expect(bytesToHex(new Uint8Array([0xab, 0xcd]))).toBe('abcd');
  });

  it('hexToBytes reverses bytesToHex', () => {
    const src = new Uint8Array([1, 2, 255]);
    const hex = bytesToHex(src);
    const back = hexToBytes(hex);
    expect(back).toEqual(src);
  });

  it('hexToBytes accepts 0x prefix', () => {
    expect(hexToBytes('0x01')).toEqual(new Uint8Array([1]));
  });

  it('hexToBytes rejects odd length', () => {
    expect(() => hexToBytes('abc')).toThrow();
  });
});
