import { formatContractId } from '../../src/config/contract-types';

describe('contract-types', () => {
  it('formats TokenContract address.name', () => {
    expect(formatContractId({ address: 'SP1', name: 'foo' })).toBe('SP1.foo');
  });

  it('returns fullId from ContractRef directly', () => {
    expect(formatContractId({ address: 'SP1', name: 'foo', fullId: 'SP1.foo' })).toBe('SP1.foo');
  });
});
