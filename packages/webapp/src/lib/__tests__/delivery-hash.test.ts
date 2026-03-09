import { describe, expect, it } from 'vitest';
import { computeBinaryHash, computeDeliverableHash, computeDeliverableHashFromText } from '@/lib/delivery-hash';

describe('delivery hash helpers', () => {
  it('canonicalizes JSON before hashing so key order does not matter', async () => {
    const first = await computeDeliverableHash({
      b: 2,
      a: {
        y: 2,
        x: 1,
      },
    });
    const second = await computeDeliverableHash({
      a: {
        x: 1,
        y: 2,
      },
      b: 2,
    });

    expect(first).toBe(second);
  });

  it('hashes JSON text using the same canonicalization as the backend', async () => {
    const hashFromValue = await computeDeliverableHash({
      data: {
        message: 'hello',
        score: 1,
      },
    });

    const hashFromText = await computeDeliverableHashFromText(
      JSON.stringify(
        {
          data: {
            score: 1,
            message: 'hello',
          },
        },
        null,
        2
      )
    );

    expect(hashFromText).toBe(hashFromValue);
  });

  it('hashes raw binary artifacts directly', async () => {
    const binaryHash = await computeBinaryHash(new TextEncoder().encode('proof artifact'));
    const textHash = await computeDeliverableHashFromText('proof artifact');

    expect(binaryHash).toBe(textHash);
  });
});
