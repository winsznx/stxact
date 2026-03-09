import { describe, expect, it } from 'vitest';
import {
  createBrowserPaymentSignature,
  decodePaymentRequiredHeader,
  formatMicroStx,
  selectPaymentOption,
} from '@/lib/x402-browser';

describe('x402 browser helpers', () => {
  it('decodes the payment-required header emitted by the backend', () => {
    const encoded = btoa(
      JSON.stringify({
        x402Version: 2,
        resource: {
          url: 'https://api.stxact.xyz/demo/premium-data',
        },
        accepts: [
          {
            scheme: 'exact',
            network: 'stacks:2147483648',
            amount: '100000',
            asset: 'STX',
            payTo: 'ST1GAV7DCD9409BR2Y6W9BJ847B1A8H9MXA1F2W0C',
          },
        ],
      })
    );

    const decoded = decodePaymentRequiredHeader(encoded);

    expect(decoded?.x402Version).toBe(2);
    expect(decoded?.accepts).toHaveLength(1);
    expect(decoded?.accepts[0].amount).toBe('100000');
  });

  it('normalizes legacy paymentRequirements payloads into accepts', () => {
    const encoded = btoa(
      JSON.stringify({
        x402Version: 2,
        paymentRequirements: {
          scheme: 'exact',
          network: 'stacks:2147483648',
          amount: '250000',
          asset: 'STX',
          payTo: 'ST1GAV7DCD9409BR2Y6W9BJ847B1A8H9MXA1F2W0C',
        },
      })
    );

    const decoded = decodePaymentRequiredHeader(encoded);

    expect(decoded?.accepts).toHaveLength(1);
    expect(decoded?.accepts[0].amount).toBe('250000');
  });

  it('selects the matching payment option for testnet', () => {
    const selection = selectPaymentOption(
      {
        x402Version: 2,
        accepts: [
          {
            scheme: 'exact',
            network: 'stacks:1',
            amount: '100000',
            asset: 'STX',
            payTo: 'SP123',
          },
          {
            scheme: 'exact',
            network: 'stacks:2147483648',
            amount: '100000',
            asset: 'STX',
            payTo: 'ST123',
          },
        ],
      },
      'testnet'
    );

    expect(selection?.network).toBe('stacks:2147483648');
    expect(selection?.payTo).toBe('ST123');
  });

  it('encodes a txid-based retry payload for browser-broadcast payments', () => {
    const encoded = createBrowserPaymentSignature({
      x402Version: 2,
      accepted: {
        scheme: 'exact',
        network: 'stacks:2147483648',
        amount: '100000',
        asset: 'STX',
        payTo: 'ST123',
      },
      payload: {
        txid: '0xabc123',
      },
      payer: 'STBUYER',
    });

    expect(JSON.parse(atob(encoded))).toEqual(
      expect.objectContaining({
        x402Version: 2,
        payer: 'STBUYER',
        payload: {
          txid: '0xabc123',
        },
      })
    );
  });

  it('formats microstx values for the buyer UI', () => {
    expect(formatMicroStx('100000')).toBe('0.1 STX');
    expect(formatMicroStx('1000000')).toBe('1 STX');
  });
});
