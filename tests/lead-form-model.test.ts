import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_DRAFT, type Saved } from "../src/lib/lead-draft";
import { buildLeadPayload, restoreLeadDraft } from "../src/lib/lead-form-model";
import { validateLead } from "../src/lib/lead-contract";

const saved: Saved = {
  expires: Date.now() + 60_000,
  draft: {
    ...EMPTY_DRAFT,
    name: "QA",
    replyTo: "qa@example.test",
    message: "Consulta anterior",
  },
  productRef: "FA-025",
  submission: {
    key: "80c0ddaf-a19b-4b01-b14a-34d46148a389",
    fingerprint: "a".repeat(64),
  },
};

void test("restoration retains the same enquiry, but a different product or intention only retains contact details", () => {
  const same = restoreLeadDraft(
    { variant: "contact", product: { ref: "FA-025", name: "QA" } },
    saved,
  );
  assert.equal(same.contextChanged, false);
  assert.deepEqual(same.draft, saved.draft);
  for (const context of [
    { variant: "contact" as const },
    { variant: "contact" as const, product: { ref: "FA-030", name: "Otro" } },
    { variant: "event" as const, initialOccasion: "boda" },
  ]) {
    const restored = restoreLeadDraft(context, saved);
    assert.equal(restored.contextChanged, true);
    assert.equal(restored.draft.name, saved.draft.name);
    assert.equal(restored.draft.replyTo, saved.draft.replyTo);
    assert.equal(restored.draft.message, "");
  }
});

void test("an edited occasion survives restoration until the route supplies another occasion context", () => {
  const event: Saved = {
    ...saved,
    productRef: undefined,
    occasionContext: "boda",
    draft: {
      ...saved.draft,
      intention: "event",
      occasion: "cumpleanos",
      dateUndecided: true,
    },
  };
  const restored = restoreLeadDraft(
    { variant: "event", initialOccasion: "boda" },
    event,
  );
  assert.equal(restored.contextChanged, false);
  assert.equal(restored.draft.occasion, "cumpleanos");
  const changed = restoreLeadDraft(
    { variant: "event", initialOccasion: "fiesta" },
    event,
  );
  assert.equal(changed.contextChanged, true);
  assert.equal(changed.draft.occasion, "fiesta");
  assert.equal(changed.draft.dateUndecided, false);
});

void test("each intention sends only its relevant fields and undecided dates omit old dates", () => {
  const draft = {
    ...saved.draft,
    occasion: "boda",
    date: "2000-01-01",
    dateUndecided: true,
    budget: "500 €",
    location: "Elche",
  };
  for (const intention of ["product", "visit", "event"] as const) {
    const payload = buildLeadPayload(
      { ...draft, intention },
      "event",
      "FA-025",
    );
    const result = validateLead(payload);
    assert.equal(result.success, true);
    if (intention === "event") {
      assert.equal("productRef" in payload, false);
      assert.equal(payload.name, undefined);
      assert.equal("date" in payload && payload.date, undefined);
    } else {
      assert.equal("occasion" in payload, false);
      assert.equal("budget" in payload, false);
      assert.equal("location" in payload, false);
    }
  }
});
