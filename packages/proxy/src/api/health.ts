import { Request, Response } from 'express';
import { getNetworkId, getStacksApiUrl } from '../config/network';
import { getConfirmationDepth } from '../config/confirmation-depth';

export interface HealthResponse {
  status: 'ok';
  network: string;
  apiUrl: string;
  confirmationDepth: number;
  uptimeSec: number;
  startedAt: string;
}

const startedAt = new Date();

export function healthHandler(_req: Request, res: Response): void {
  const body: HealthResponse = {
    status: 'ok',
    network: getNetworkId(),
    apiUrl: getStacksApiUrl(),
    confirmationDepth: getConfirmationDepth(),
    uptimeSec: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    startedAt: startedAt.toISOString(),
  };
  res.json(body);
}
