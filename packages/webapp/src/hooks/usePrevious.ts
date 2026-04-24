'use client';

import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}


/**
 * Generic container isolating current and previous render cycles.
 */
export interface PreviousStateRecord<T> { readonly current: T; readonly previous: T | undefined; }
