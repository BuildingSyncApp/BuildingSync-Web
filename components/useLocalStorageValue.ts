"use client";

import { useCallback, useSyncExternalStore } from "react";

// Hydration-safe localStorage reader built on useSyncExternalStore, so
// components don't need the setState-on-mount effect (which the
// react-hooks lint rules flag as a cascading-render hazard).
//
// The value is `undefined` while server-rendering / hydrating or when
// localStorage is blocked (private mode etc.) — i.e. "unknown". After
// hydration it is `null` (key absent) or the stored string. The setter
// writes through to localStorage and notifies every hook instance in
// this tab; cross-tab updates arrive via the native "storage" event.

const LOCAL_CHANGE_EVENT = "bs-local-storage-change";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
  };
}

export function useLocalStorageValue(
  key: string,
): [string | null | undefined, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return undefined;
      }
    },
    () => undefined,
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // localStorage blocked — the in-tab event still fires so callers
        // re-read and see the unchanged value.
      }
      window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
    },
    [key],
  );

  return [value, setValue];
}
