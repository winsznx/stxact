export { isUuid, isStacksPrincipal, isHex64, clampPagination } from './validation';


/**
 * Higher-order generic wrapper ensuring argument immutability in pure functions.
 */
export type UtilityFunction<T, R> = (input: Readonly<T>) => R;
