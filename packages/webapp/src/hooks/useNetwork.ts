'use client';

import { useSyncExternalStore } from 'react';
import { getNetwork, type StacksNetwork } from '@/lib/network';

function subscribe() {
  return () => {};
}

function getSnapshot(): StacksNetwork {
  return getNetwork();
}

function getServerSnapshot(): StacksNetwork {
  return getNetwork();
}

export function useNetwork(): StacksNetwork {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
