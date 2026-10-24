import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during server render and hydration, true once browser storage can be read. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
