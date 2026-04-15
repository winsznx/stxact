export const queryKeys = {
  services: {
    all: ['services'] as const,
    list: (params?: Record<string, unknown>) => ['services', params] as const,
    detail: (principal: string) => ['service', principal] as const,
  },
  receipts: {
    all: ['receipts'] as const,
    list: (params?: Record<string, unknown>) => ['receipts', params] as const,
    detail: (id: string) => ['receipt', id] as const,
  },
  disputes: {
    all: ['disputes'] as const,
    list: (params?: Record<string, unknown>) => ['disputes', params] as const,
    detail: (id: string) => ['dispute', id] as const,
  },
  reputation: {
    detail: (principal: string) => ['reputation', principal] as const,
  },
} as const;
