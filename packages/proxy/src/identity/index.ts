export { verifyBNSOwnership } from './bns';


/**
 * Internal identity state following successful decentralized resolution.
 */
export interface IdentityContext { readonly did: string; readonly verified: boolean; }
