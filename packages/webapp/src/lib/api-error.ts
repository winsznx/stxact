import { APIError } from '@/lib/api';

export function isApiError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.statusCode === 404;
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiError(error) && error.statusCode === 401;
}
