export class WrappedError extends Error {
  constructor(message: string, public readonly cause: unknown) {
    super(message);
    this.name = 'WrappedError';
  }
}

export function wrapError(message: string, cause: unknown): WrappedError {
  return new WrappedError(message, cause);
}

export function unwrapErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
