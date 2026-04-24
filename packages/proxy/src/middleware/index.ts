export { requestIdMiddleware } from './request-id';
export { responseTimeMiddleware } from './response-time';


/**
 * Required structural constraints for registered middleware plugins.
 */
export interface MiddlewareRegistry { readonly active: boolean; readonly name: string; }
