import {
  DRAFT_TTL,
  type Draft,
  type Saved,
  type Submission,
} from "./lead-draft";

const DRAFT_EVENT = "piroboom:lead-draft";

export function readDraftSnapshot(key: string): string {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
export function subscribeDraft(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(DRAFT_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(DRAFT_EVENT, notify);
  };
}
export function serverDraftSnapshot(): null {
  return null;
}
export function clearDraft(key: string, expectedSnapshot?: string) {
  try {
    if (
      expectedSnapshot !== undefined &&
      sessionStorage.getItem(key) !== expectedSnapshot
    )
      return false;
    sessionStorage.removeItem(key);
  } catch {
    /* Storage may be unavailable; the current form still works. */
    return false;
  }
  window.dispatchEvent(new Event(DRAFT_EVENT));
  return true;
}
export function saveDraft(
  key: string,
  draft: Draft,
  submission?: Submission,
  productRef?: string,
  occasionContext?: string,
) {
  try {
    const snapshot = JSON.stringify({
      draft,
      submission,
      productRef,
      occasionContext,
      expires: Date.now() + DRAFT_TTL,
    } satisfies Saved);
    sessionStorage.setItem(key, snapshot);
    window.dispatchEvent(new Event(DRAFT_EVENT));
    return snapshot;
  } catch {
    /* Storage is optional; the in-memory draft remains usable. */
    return undefined;
  }
}
