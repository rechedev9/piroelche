"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  clearDraft,
  readDraftSnapshot,
  serverDraftSnapshot,
  subscribeDraft,
} from "@/lib/lead-draft-store";

import { parseDraftSnapshot } from "@/lib/lead-draft";

/**
 * Subscribes to the stored draft for this tab and drops it when it expires.
 * `snapshot` is null until hydration, so the form can stay disabled until then.
 */
export function useLeadDraft(storageKey: string, onExpired: () => void) {
  const expired = useRef(onExpired);
  useEffect(() => {
    expired.current = onExpired;
  }, [onExpired]);
  const snapshot = useSyncExternalStore(
    subscribeDraft,
    useCallback(() => readDraftSnapshot(storageKey), [storageKey]),
    serverDraftSnapshot,
  );
  const saved = useMemo(() => parseDraftSnapshot(snapshot), [snapshot]);
  useEffect(() => {
    if (!snapshot) return undefined;
    if (!saved) {
      clearDraft(storageKey, snapshot);
      return undefined;
    }
    const expiry = setTimeout(
      () => {
        if (clearDraft(storageKey, snapshot)) expired.current();
      },
      Math.max(0, saved.expires - Date.now()),
    );
    return () => clearTimeout(expiry);
  }, [snapshot, saved, storageKey]);
  return { snapshot, saved, ready: snapshot !== null };
}
