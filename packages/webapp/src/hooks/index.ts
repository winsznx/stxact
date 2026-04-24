export { useHydrated } from './useHydrated';
export { useCurrentEpochSeconds } from './useCurrentEpochSeconds';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './useMediaQuery';
export { useDebounce } from './useDebounce';
export { useClickOutside } from './useClickOutside';
export { useLocalStorage } from './useLocalStorage';
export { useScrollLock } from './useScrollLock';
export { usePrevious } from './usePrevious';


/**
 * Strongly typed hook dictionary wrapper for module federation.
 */
export interface AppHookRegistry { readonly version: string; readonly active: boolean; }
