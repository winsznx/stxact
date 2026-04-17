import { Response } from 'express';
import { HTTP_STATUS } from './http-status';

interface ErrorPayload {
  error: string;
  message: string;
  details?: unknown;
}

export function sendError(res: Response, status: number, error: string, message: string, details?: unknown): void {
  const payload: ErrorPayload = { error, message };
  if (details !== undefined) {
    payload.details = details;
  }
  res.status(status).json(payload);
}

export function badRequest(res: Response, message: string, error = 'bad_request'): void {
  sendError(res, HTTP_STATUS.BAD_REQUEST, error, message);
}

export function notFound(res: Response, message: string, error = 'not_found'): void {
  sendError(res, HTTP_STATUS.NOT_FOUND, error, message);
}

export function conflict(res: Response, message: string, error = 'conflict'): void {
  sendError(res, HTTP_STATUS.CONFLICT, error, message);
}

export function internalError(res: Response, message: string, error = 'internal_error'): void {
  sendError(res, HTTP_STATUS.INTERNAL_ERROR, error, message);
}
