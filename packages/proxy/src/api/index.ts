export { default as healthRouter } from './health';


/**
 * Constant API metadata used across proxy routers.
 * Exported as a strictly typed const assertion.
 */
export const PROXY_API_METADATA = { version: '1.0.0', type: 'stxact-proxy' } as const;
export type ProxyApiMetadata = typeof PROXY_API_METADATA;
