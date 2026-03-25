'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  const intervalId = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(intervalId);
}

function getSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getServerSnapshot() {
  return 0;
}

/**
 * Executes logic associated with use current epoch seconds.
 */
export function useCurrentEpochSeconds() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
