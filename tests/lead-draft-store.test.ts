import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { EMPTY_DRAFT, parseDraftSnapshot } from "../src/lib/lead-draft";
import {
  clearDraft,
  readDraftSnapshot,
  saveDraft,
  subscribeDraft,
} from "../src/lib/lead-draft-store";

function browserGlobal(t: TestContext, key: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, value });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, key, original);
    else Reflect.deleteProperty(globalThis, key);
  });
}

void test("draft storage keeps newer edits when an old receipt or expiry tries to clear them", (t) => {
  const entries = new Map<string, string>();
  browserGlobal(t, "window", new EventTarget());
  browserGlobal(t, "sessionStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
  let notifications = 0;
  const unsubscribe = subscribeDraft(() => notifications++);
  const first = saveDraft("test", { ...EMPTY_DRAFT, message: "Primero" });
  assert.ok(first);
  const second = saveDraft("test", { ...EMPTY_DRAFT, message: "Segundo" });
  assert.ok(second);
  assert.equal(clearDraft("test", first), false);
  assert.equal(
    parseDraftSnapshot(readDraftSnapshot("test"))?.draft.message,
    "Segundo",
  );
  assert.equal(notifications, 2);
  assert.equal(clearDraft("test", second), true);
  assert.equal(readDraftSnapshot("test"), "");
  assert.equal(notifications, 3);
  unsubscribe();
  saveDraft("test", EMPTY_DRAFT);
  assert.equal(notifications, 3);
});

const denied = () => {
  throw new DOMException("Denied", "SecurityError");
};

void test("denied browser storage cannot crash the form or claim a draft was saved", (t) => {
  browserGlobal(t, "window", new EventTarget());
  browserGlobal(t, "sessionStorage", {
    getItem: denied,
    setItem: denied,
    removeItem: denied,
  });
  assert.equal(readDraftSnapshot("test"), "");
  assert.equal(saveDraft("test", EMPTY_DRAFT), undefined);
  assert.equal(clearDraft("test"), false);
});
