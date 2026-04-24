'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Executes logic associated with use hydrated.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}


/**
 * Component boundary state defining isomorphic rendering completion.
 */
export interface HydrationState { readonly hydrated: boolean; }
