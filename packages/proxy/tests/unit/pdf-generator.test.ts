import { generateReceiptPDF } from '../../src/utils/pdf-generator';

describe('generateReceiptPDF', () => {
  test('renders a branded receipt pdf buffer', async () => {
    const buffer = await generateReceiptPDF({
      receipt_id: '8d6d1b02-c5fe-4e40-a993-1d7e0d2328b8',
      request_hash: '15b8f346c628585f68dda4bc5a13cbcc15660be4a2a9996c226f728c4192345',
      payment_txid: '0x41d3654f0ae021d1eaacbabcb7b8395af3652d1039c7896c4a102c1118007e9d',
      seller_principal: 'ST1GAV7DCD9409BR2Y6W9BJ847B1A8H9MXA1F2W0C',
      seller_bns_name: 'demo-provider.btc',
      buyer_principal: 'ST1PGD0RB7J9315734C1K7WDE1QS6X2B36PX2K8ZV',
      delivery_commitment: '08f2789fcbcc1e107807f4a2996bc5c4372e81e0e962f701ab64cc8b0babccda3',
      timestamp: 1773090617,
      block_height: 3884940,
      block_hash: '0x2691a3d6f7c402107f3bf3d8b6c4333aaa6aae9dbba2d5ea5d36407514f54322',
      key_version: 1,
      revision: 0,
      service_policy_hash: '0081fd7a7735858e58274f313fa9bcd008108e3c1b92a0be889e20cc07e5126b',
      metadata: {
        endpoint: 'GET /demo/premium-data',
        price_sats: '100000',
        asset: 'STX',
      },
      signature: 'OWvacfPc3iBRwdroA6UuKW6AN1mM8o/InacXyf2aRY/PJrb4dEBj+IDC4Ay2jajFYkbldL9FLeoPIDHRhwAA=',
    });

    expect(buffer.length).toBeGreaterThan(1500);
    expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
  });
});
