import assert from "node:assert/strict";
import test from "node:test";
import { parseSavedLeadDraft } from "../src/lib/lead-draft";
import { parseLeadResponse } from "../src/lib/lead-contract";

const now = Date.parse("2026-09-09T12:00:00.000Z");
const draft = {
  intention: "product",
  name: "Prueba local",
  replyTo: "form@example.test",
  message: "Consulta sintética.",
  occasion: "",
  date: "",
  dateUndecided: false,
  location: "",
  budget: "",
  website: "",
};
const submission = {
  key: "80c0ddaf-a19b-4b01-b14a-34d46148a389",
  fingerprint: "a".repeat(64),
};

void test("saved draft preserves retry identity and public product context only within 30 minutes", () => {
  const saved = {
    expires: now + 30 * 60_000,
    draft,
    productRef: "FA-025",
    submission,
  };
  assert.deepEqual(parseSavedLeadDraft(saved, now), saved);
  const changedOccasion = {
    ...saved,
    draft: { ...draft, intention: "event", occasion: "cumpleanos" },
    productRef: undefined,
    occasionContext: "boda",
  };
  assert.deepEqual(parseSavedLeadDraft(changedOccasion, now), changedOccasion);
  assert.equal(parseSavedLeadDraft(saved, saved.expires), undefined);
  assert.equal(
    parseSavedLeadDraft({ ...saved, expires: now - 1 }, now),
    undefined,
  );
  assert.equal(
    parseSavedLeadDraft({ ...saved, expires: now + 30 * 60_000 + 1 }, now),
    undefined,
  );
  assert.equal(
    parseSavedLeadDraft({ ...saved, unknown: true }, now),
    undefined,
  );
});

void test("untrusted session data cannot restore malformed fields, types or retry keys", () => {
  const saved = { expires: now + 10_000, draft, submission };
  for (const invalid of [
    null,
    { ...saved, draft: { ...draft, intention: "unexpected" } },
    { ...saved, draft: { ...draft, dateUndecided: "true" } },
    { ...saved, draft: { ...draft, replyTo: "x".repeat(255) } },
    { ...saved, submission: { ...submission, key: "invalid-key" } },
    { ...saved, submission: { ...submission, fingerprint: "not-a-hash" } },
    { ...saved, productRef: "FA-025?email=example" },
  ])
    assert.equal(parseSavedLeadDraft(invalid, now), undefined);
});

void test("API parser only accepts genuine receipt shape and bounded known error fields", () => {
  const receipt = {
    ok: true,
    status: "recorded",
    id: "PB-0123456789ABCDEF01234567",
    receivedAt: "2026-09-09T12:00:00.000Z",
    replayed: false,
    mode: "local-test",
  };
  assert.deepEqual(parseLeadResponse(receipt), receipt);
  const failure = {
    ok: false,
    code: "validation_failed",
    message: "Revisa los campos.",
    fieldErrors: { replyTo: "Indica un canal válido." },
  };
  assert.deepEqual(parseLeadResponse(failure), failure);
  for (const invalid of [
    {},
    { ...receipt, id: "client-generated-ticket" },
    { ...receipt, receivedAt: "2026-02-31T12:00:00.000Z" },
    { ...receipt, mode: "mailbox-delivered" },
    { ...receipt, replyTo: "form@example.test" },
    { ...failure, code: "arbitrary-provider-message" },
    { ...failure, fieldErrors: { replyTo: { unexpected: "object" } } },
    { ...failure, fieldErrors: { "untrusted-anchor": "invalid" } },
  ])
    assert.equal(parseLeadResponse(invalid), undefined);
});
