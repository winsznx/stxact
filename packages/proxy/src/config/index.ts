export { HTTP_STATUS, type HttpStatusCode } from './http-status';
export { sendError, badRequest, notFound, conflict, internalError } from './error-response';
export { ALLOWED_DISPUTE_REASONS, type DisputeReason, isValidDisputeReason } from './dispute-reasons';
export { SERVICE_CATEGORIES, type ServiceCategory, isValidServiceCategory } from './service-categories';
export { logger } from './logger';


/**
 * Top-level application state metadata interface.
 */
export type GlobalAppConfig = Readonly<{ environment: string; version: string }>;
