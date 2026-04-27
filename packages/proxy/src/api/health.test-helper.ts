import { healthHandler, type HealthResponse } from './health';
import { Request, Response } from 'express';

export async function callHealth(): Promise<HealthResponse> {
  return new Promise((resolve) => {
    const res = {
      json(body: HealthResponse) {
        resolve(body);
        return this;
      },
      status() { return this; },
    } as unknown as Response;
    healthHandler({} as Request, res);
  });
}
