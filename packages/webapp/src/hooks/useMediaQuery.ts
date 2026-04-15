'use client';

import { useSyncExternalStore } from 'react';

function createMediaQueryStore(query: string) {
  function subscribe(callback: () => void) {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
  }

  function getSnapshot() {
    return window.matchMedia(query).matches;
  }

  function getServerSnapshot() {
    return false;
  }

  return { subscribe, getSnapshot, getServerSnapshot };
}

const stores = new Map<string, ReturnType<typeof createMediaQueryStore>>();

function getStore(query: string) {
  if (!stores.has(query)) {
    stores.set(query, createMediaQueryStore(query));
  }
  return stores.get(query)!;
}

export function useMediaQuery(query: string): boolean {
  const store = getStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
