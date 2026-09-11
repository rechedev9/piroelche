import assert from "node:assert/strict";
import test from "node:test";
import { sendLead } from "../src/lib/lead-client";

const receipt = {
  ok: true,
  status: "recorded",
  id: "PB-0123456789ABCDEF01234567",
  receivedAt: "2026-09-09T12:00:00.000Z",
  replayed: false,
  mode: "local-test",
};
const key = "80c0ddaf-a19b-4b01-b14a-34d46148a389";
const signal = new AbortController().signal;

void test("lead transport preserves retry identity and only accepts a status matching the receipt", async () => {
  const body = JSON.stringify({ intention: "visit", name: "QA" });
  for (const [status, replayed] of [
    [201, false],
    [200, true],
  ] as const) {
    const fetcher: typeof fetch = (url, options) => {
      assert.equal(url, "/api/leads/");
      assert.equal(options?.method, "POST");
      assert.equal(options?.body, body);
      assert.equal(options?.signal, signal);
      assert.equal(new Headers(options?.headers).get("Idempotency-Key"), key);
      return Promise.resolve(
        Response.json({ ...receipt, replayed }, { status }),
      );
    };
    assert.deepEqual(await sendLead(body, key, signal, fetcher), {
      ...receipt,
      replayed,
    });
  }
  for (const [status, replayed] of [
    [200, false],
    [201, true],
    [202, false],
    [503, false],
  ] as const) {
    await assert.rejects(
      sendLead(body, key, signal, () =>
        Promise.resolve(Response.json({ ...receipt, replayed }, { status })),
      ),
      /invalid_lead_receipt_status/,
    );
  }
});

void test("lead transport rejects malformed replies and propagates network failures for safe retries", async () => {
  for (const value of [
    null,
    {},
    { ...receipt, receivedAt: "2026-02-31T12:00:00.000Z" },
  ]) {
    await assert.rejects(
      sendLead("{}", key, signal, () => Promise.resolve(Response.json(value))),
      /invalid_lead_response/,
    );
  }
  const failure = {
    ok: false,
    code: "rate_limited",
    message: "Espera y reintenta.",
  };
  assert.deepEqual(
    await sendLead("{}", key, signal, () =>
      Promise.resolve(Response.json(failure, { status: 429 })),
    ),
    failure,
  );
  const abort = new DOMException("Timed out", "AbortError");
  await assert.rejects(
    sendLead("{}", key, signal, () => Promise.reject(abort)),
    (error: unknown) => error === abort,
  );
});
