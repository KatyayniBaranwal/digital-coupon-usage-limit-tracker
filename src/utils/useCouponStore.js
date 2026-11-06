import { useSyncExternalStore } from 'react';
import { store } from './storeInstance.js';

/**
 * Subscribes the component to the store. The returned `version` number changes
 * after every mutation, so it can be used as a useMemo dependency.
 */
export function useCouponStore() {
  const version = useSyncExternalStore(store.subscribe, store.getVersion);
  return { store, version };
}
