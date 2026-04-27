export interface HealthResponseBody {
  status: 'ok' | 'degraded' | 'down';
  network: 'mainnet' | 'testnet' | 'mocknet';
  apiUrl: string;
  confirmationDepth: number;
  uptimeSec: number;
  startedAt: string;
}

export type HealthStatus = HealthResponseBody['status'];
