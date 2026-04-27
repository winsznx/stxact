import { Response } from 'express';

export interface ApiErrorBody {
  error: string;
  message: string;
  status: number;
  details?: unknown;
}

export function sendError(res: Response, status: number, code: string, message: string, details?: unknown): void {
  const body: ApiErrorBody = { error: code, message, status };
  if (details !== undefined) body.details = details;
  res.status(status).json(body);
}

export function sendNotFound(res: Response, message = 'Not found'): void {
  sendError(res, 404, 'not_found', message);
}

export function sendBadRequest(res: Response, message: string, details?: unknown): void {
  sendError(res, 400, 'bad_request', message, details);
}

export function sendUnauthorized(res: Response, message = 'Unauthorized'): void {
  sendError(res, 401, 'unauthorized', message);
}

export function sendInternalError(res: Response, message = 'Internal error'): void {
  sendError(res, 500, 'internal_error', message);
}
