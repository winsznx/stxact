import { Request, Response } from 'express';
import { healthHandler } from '../../src/api/health';
import { resetNetworkCache } from '../../src/config/network';

describe('health endpoint', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  function makeRes() {
    const body: Record<string, unknown> = {};
    const res = {
      json(payload: Record<string, unknown>) {
        Object.assign(body, payload);
        return this;
      },
      status() {
        return this;
      },
    } as unknown as Response;
    return { res, body };
  }

  it('returns ok status and current network', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    const { res, body } = makeRes();
    healthHandler({} as Request, res);
    expect(body.status).toBe('ok');
    expect(body.network).toBe('mainnet');
  });

  it('reports network-aware confirmation depth', () => {
    process.env.STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    const { res, body } = makeRes();
    healthHandler({} as Request, res);
    expect(body.confirmationDepth).toBe(1);
  });

  it('reports api URL derived from network', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    const { res, body } = makeRes();
    healthHandler({} as Request, res);
    expect(body.apiUrl).toBe('https://api.mainnet.hiro.so');
  });

  it('includes uptime field', () => {
    const { res, body } = makeRes();
    healthHandler({} as Request, res);
    expect(typeof body.uptimeSec).toBe('number');
    expect((body.uptimeSec as number) >= 0).toBe(true);
  });
});
