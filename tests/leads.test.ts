import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { z } from "zod";
import { startLocalReceiver } from "../scripts/local-receiver";
import {
  leadSchema,
  madridDate,
  normalizeReplyTo,
  validateLead,
} from "../src/lib/lead-contract";
import { getLeadAvailability, handleLeadRequest } from "../src/lib/lead-server";

const token = "local-test-token-00000000000000000000000000000000";
const origin = "http://127.0.0.1:3000";
const today = new Date("2026-09-09T12:00:00.000Z");
const visit = {
  intention: "visit",
  name: "Prueba local",
  replyTo: "form@example.test",
  message: "Prueba sintética; no enviar a personas reales.",
  website: "",
};
const event = {
  intention: "event",
  replyTo: "+34 600 000 000",
  occasion: "boda",
  dateUndecided: true,
};
const content = {
  getProductByRef: (ref: string) =>
    ref === "FA-025" ? { ref, name: "Producto de prueba" } : undefined,
};
const acceptedResponseSchema = z
  .object({
    ok: z.literal(true),
    status: z.literal("recorded"),
    id: z.string().regex(/^PB-[A-F0-9]{24}$/),
    receivedAt: z.string(),
    replayed: z.boolean(),
    mode: z.enum(["local-test", "remote"]),
  })
  .strict();
const rejectedResponseSchema = z
  .object({
    ok: z.literal(false),
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  })
  .strict();
async function acceptedBody(response: Response) {
  return acceptedResponseSchema.parse(await response.json());
}
async function rejectedBody(response: Response) {
  return rejectedResponseSchema.parse(await response.json());
}

function request(
  body: unknown = visit,
  key: string = randomUUID(),
  headers: Record<string, string> = {},
) {
  return new Request(`${origin}/api/leads/`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "idempotency-key": key,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function localEnv(url: string) {
  return {
    LEADS_RECEIVER_MODE: "local-test",
    LEADS_RECEIVER_URL: url,
    LEADS_RECEIVER_TOKEN: token,
    LEADS_RECEIVER_TIMEOUT_MS: "1000",
  };
}

function privateTestDirectory() {
  const parent = resolve(tmpdir());
  const directory = mkdtempSync(join(parent, "piroboom-leads-"));
  return {
    directory,
    dispose() {
      const target = resolve(directory);
      assert.ok(target.startsWith(`${parent}${sep}piroboom-leads-`));
      assert.notEqual(target, parent);
      rmSync(target, { recursive: true, force: true });
    },
  };
}

function records(databasePath: string) {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return z
      .array(
        z.object({
          id: z.string(),
          payload: z.string().nullable(),
          received_ms: z.number(),
        }),
      )
      .parse(
        database.prepare("SELECT id, payload, received_ms FROM leads").all(),
      );
  } finally {
    database.close();
  }
}

void test("reply channel accepts usual email/phone formats and rejects injection or two channels", () => {
  assert.equal(
    normalizeReplyTo("  Nombre+evento@EXAMPLE.TEST  "),
    "Nombre+evento@example.test",
  );
  assert.equal(normalizeReplyTo("0034 (600) 000-000"), "+34600000000");
  assert.equal(normalizeReplyTo("+44 20 7946 0000"), "+442079460000");
  assert.equal(normalizeReplyTo("600.000.000"), "600000000");
  for (const invalid of [
    "persona@example.test\r\nBcc: otro@example.test",
    "a@example.test, b@example.test",
    "123",
    "+12+3456789",
    "hola",
    "600000000 / a@example.test",
  ]) {
    assert.equal(normalizeReplyTo(invalid), undefined);
  }
});

void test("discriminated forms reject stale/unknown fields and allow honest undecided events", () => {
  const validEvent = validateLead(event, today);
  assert.equal(validEvent.success, true);
  assert.equal(
    validateLead({ ...event, location: "", budget: "" }, today).success,
    true,
  );
  assert.equal(
    validateLead({ ...visit, productRef: "FA-025" }, today).success,
    false,
  );
  assert.equal(
    validateLead({ ...event, productRef: "FA-025" }, today).success,
    false,
  );
  assert.equal(
    validateLead({ ...visit, unplanned: "value" }, today).success,
    false,
  );
  assert.equal(
    validateLead({ ...event, occasion: "inexistente" }, today).success,
    false,
  );
  assert.equal(
    validateLead({ ...event, occasion: "boda", name: "" }, today).success,
    true,
  );
  assert.equal(
    validateLead(
      { ...visit, intention: "product", productRef: "FA-025", message: "" },
      today,
    ).success,
    true,
  );
  assert.equal(
    validateLead({ ...visit, intention: "product", message: "" }, today)
      .success,
    false,
  );
  assert.equal(validateLead({ ...visit, name: "" }, today).success, false);
  assert.equal(validateLead({ ...visit, message: "" }, today).success, false);
  assert.equal(
    validateLead({ ...visit, website: "bot-filled-field" }, today).success,
    false,
  );
});

void test("dates use Madrid at midnight and validate real dates, past days and undecided conflicts", () => {
  const summerMidnight = new Date("2026-09-09T22:30:00Z");
  const winterMidnight = new Date("2026-12-31T23:30:00Z");
  assert.equal(madridDate(summerMidnight), "2026-09-10");
  assert.equal(madridDate(winterMidnight), "2027-01-01");
  assert.equal(
    validateLead(
      { ...event, dateUndecided: false, date: "2026-09-09" },
      summerMidnight,
    ).success,
    false,
  );
  assert.equal(
    validateLead(
      { ...event, dateUndecided: false, date: "2026-09-10" },
      summerMidnight,
    ).success,
    true,
  );
  assert.equal(
    validateLead({ ...event, dateUndecided: false, date: "2027-02-29" }, today)
      .success,
    false,
  );
  assert.equal(
    validateLead({ ...event, dateUndecided: false, date: "2028-02-29" }, today)
      .success,
    true,
  );
  assert.equal(
    validateLead({ ...event, dateUndecided: false, date: "2026-09-31" }, today)
      .success,
    false,
  );
  assert.equal(
    validateLead({ ...event, dateUndecided: false, date: "" }, today).success,
    false,
  );
  assert.equal(
    validateLead({ ...event, date: "2026-09-10" }, today).success,
    false,
  );
});

void test("missing destination and unsafe configurations cannot claim acceptance", async () => {
  let sent = false;
  const response = await handleLeadRequest(request(), {
    ...content,
    env: {},
    fetch: async () => {
      sent = true;
      return new Response();
    },
  });
  assert.equal(response.status, 503);
  assert.equal((await rejectedBody(response)).code, "not_configured");
  assert.equal(sent, false);
  assert.deepEqual(getLeadAvailability({}), {
    enabled: false,
    mode: "disabled",
  });
  assert.equal(
    getLeadAvailability({
      ...localEnv("http://127.0.0.1:4010/leads"),
      VERCEL: "1",
    }).enabled,
    false,
  );
  assert.equal(
    getLeadAvailability(localEnv("http://example.test/leads")).enabled,
    false,
  );
  assert.equal(
    getLeadAvailability({
      ...localEnv("http://example.test/leads"),
      LEADS_RECEIVER_MODE: "remote",
      LEADS_ALLOWED_ORIGINS: "https://example.test",
    }).enabled,
    false,
  );
  assert.equal(
    getLeadAvailability({
      ...localEnv("https://receiver.example.test/leads"),
      LEADS_RECEIVER_MODE: "remote",
      LEADS_ALLOWED_ORIGINS: "https://pirotecniaelche.es",
    }).enabled,
    true,
  );
  assert.equal(
    getLeadAvailability({
      ...localEnv("https://receiver.example.test/leads"),
      LEADS_RECEIVER_MODE: "remote",
    }).enabled,
    false,
  );
});

void test("endpoint rejects CSRF, oversized/malformed JSON, honeypot and unpublished products before delivery", async () => {
  const env = localEnv("http://127.0.0.1:4010/leads");
  let sent = 0;
  const dependencies = {
    ...content,
    env,
    now: () => today,
    fetch: async () => {
      sent++;
      return new Response();
    },
  };
  assert.equal(
    (
      await handleLeadRequest(
        request(visit, randomUUID(), { origin: "https://attacker.example" }),
        dependencies,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleLeadRequest(
        request(visit, randomUUID(), { origin: "" }),
        dependencies,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleLeadRequest(
        request(visit, randomUUID(), { "sec-fetch-site": "cross-site" }),
        dependencies,
      )
    ).status,
    403,
  );
  assert.equal(
    (await handleLeadRequest(request(visit, "short"), dependencies)).status,
    400,
  );
  assert.equal(
    (
      await handleLeadRequest(
        request(visit, randomUUID(), { "content-type": "text/plain" }),
        dependencies,
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await handleLeadRequest(
        request({ ...visit, message: "a".repeat(17_000) }),
        dependencies,
      )
    ).status,
    413,
  );
  const malformed = new Request(`${origin}/api/leads/`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "idempotency-key": randomUUID(),
    },
    body: "{",
  });
  assert.equal((await handleLeadRequest(malformed, dependencies)).status, 400);
  const unknownProduct = await handleLeadRequest(
    request({ ...visit, intention: "product", productRef: "RETIRED" }),
    dependencies,
  );
  assert.equal(unknownProduct.status, 422);
  assert.ok((await rejectedBody(unknownProduct)).fieldErrors?.productRef);
  const honeypot = await handleLeadRequest(
    request({ ...visit, website: "https://bot.example" }),
    dependencies,
  );
  assert.equal(honeypot.status, 422);
  assert.equal(sent, 0);
});

void test("real HTTP acceptance writes private durable data, replays concurrent retries once, and survives restart", async () => {
  const storage = privateTestDirectory();
  let receiver = await startLocalReceiver({
    storageDirectory: storage.directory,
    token,
    port: 0,
    now: () => today,
  });
  const key = randomUUID();
  try {
    const call = () =>
      handleLeadRequest(request(visit, key), {
        ...content,
        env: localEnv(receiver.url),
        now: () => today,
      });
    const responses = await Promise.all(Array.from({ length: 10 }, call));
    assert.equal(
      responses.filter((response) => response.status === 201).length,
      1,
    );
    assert.equal(
      responses.filter((response) => response.status === 200).length,
      9,
    );
    const receipts = await Promise.all(responses.map(acceptedBody));
    assert.equal(new Set(receipts.map((receipt) => receipt.id)).size, 1);
    assert.equal(receipts[0].mode, "local-test");
    assert.equal(receipts[0].status, "recorded");
    assert.ok(!JSON.stringify(receipts).includes(visit.replyTo));
    assert.ok(!JSON.stringify(receipts).includes(visit.message));
    assert.equal(records(receiver.databasePath).length, 1);
    assert.equal(
      leadSchema.parse(JSON.parse(records(receiver.databasePath)[0].payload!))
        .replyTo,
      visit.replyTo,
    );
    const originalId = receipts[0].id;
    await receiver.close();
    receiver = await startLocalReceiver({
      storageDirectory: storage.directory,
      token,
      port: 0,
      now: () => today,
    });
    const replay = await handleLeadRequest(request(visit, key), {
      ...content,
      env: localEnv(receiver.url),
      now: () => today,
    });
    assert.equal(replay.status, 200);
    assert.equal((await acceptedBody(replay)).id, originalId);
    const conflict = await handleLeadRequest(
      request({ ...visit, message: "Otro mensaje sintético." }, key),
      { ...content, env: localEnv(receiver.url), now: () => today },
    );
    assert.equal(conflict.status, 409);
    assert.equal(records(receiver.databasePath).length, 1);
  } finally {
    await receiver.close();
    storage.dispose();
  }
});

void test("authenticated receiver rejects direct untrusted calls and persists the rate limit across restart", async () => {
  const storage = privateTestDirectory();
  let receiver = await startLocalReceiver({
    storageDirectory: storage.directory,
    token,
    port: 0,
    clientLimit: 2,
    now: () => today,
  });
  try {
    const unauthorized = await fetch(receiver.url, {
      method: "POST",
      body: JSON.stringify(visit),
    });
    assert.equal(unauthorized.status, 401);
    const wrongProtocol = await fetch(receiver.url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(visit),
    });
    assert.equal(wrongProtocol.status, 400);
    const key = randomUUID();
    for (const currentKey of [key, randomUUID()])
      assert.equal(
        (
          await handleLeadRequest(request(visit, currentKey), {
            ...content,
            env: localEnv(receiver.url),
            now: () => today,
          })
        ).status,
        201,
      );
    await receiver.close();
    receiver = await startLocalReceiver({
      storageDirectory: storage.directory,
      token,
      port: 0,
      clientLimit: 2,
      now: () => today,
    });
    const limited = await handleLeadRequest(request(), {
      ...content,
      env: localEnv(receiver.url),
      now: () => today,
    });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    const acceptedReplay = await handleLeadRequest(request(visit, key), {
      ...content,
      env: localEnv(receiver.url),
      now: () => today,
    });
    assert.equal(acceptedReplay.status, 200);
    assert.equal(records(receiver.databasePath).length, 2);
  } finally {
    await receiver.close();
    storage.dispose();
  }
});

void test("timeout after durable acceptance recovers the original server receipt without a second record", async () => {
  const storage = privateTestDirectory();
  const receiver = await startLocalReceiver({
    storageDirectory: storage.directory,
    token,
    port: 0,
    now: () => today,
    responseDelayMs: 200,
  });
  try {
    const env = { ...localEnv(receiver.url), LEADS_RECEIVER_TIMEOUT_MS: "50" };
    const key = randomUUID();
    const timedOut = await handleLeadRequest(request(visit, key), {
      ...content,
      env,
      now: () => today,
    });
    assert.equal(timedOut.status, 504);
    assert.equal((await rejectedBody(timedOut)).ok, false);
    const stored = records(receiver.databasePath);
    assert.equal(stored.length, 1);
    const retry = await handleLeadRequest(request(visit, key), {
      ...content,
      env,
      now: () => today,
    });
    assert.equal(retry.status, 200);
    const receipt = await acceptedBody(retry);
    assert.equal(receipt.id, stored[0].id);
    assert.equal(receipt.replayed, true);
    assert.equal(records(receiver.databasePath).length, 1);
  } finally {
    await receiver.close();
    storage.dispose();
  }
});

void test("provider errors and malformed success responses never become an accepted lead", async () => {
  const env = localEnv("http://127.0.0.1:4010/leads");
  for (const providerResponse of [
    new Response("{}", { status: 200 }),
    new Response("failure", { status: 500 }),
    new Response("{}", { status: 202 }),
  ]) {
    const response = await handleLeadRequest(request(), {
      ...content,
      env,
      now: () => today,
      fetch: async () => providerResponse,
    });
    assert.equal(response.status, 503);
    const result = await rejectedBody(response);
    assert.equal(result.ok, false);
    assert.equal(result.code, "unavailable");
    assert.ok(!JSON.stringify(result).includes(token));
  }
  const unreachable = await handleLeadRequest(request(), {
    ...content,
    env,
    now: () => today,
    fetch: async () => {
      throw new Error(
        "A provider error containing data that must not be exposed.",
      );
    },
  });
  assert.equal(unreachable.status, 503);
  assert.ok(!(await unreachable.text()).includes("containing data"));
});

void test("retention removes message contents, keeps bounded replay metadata, then expires it", async () => {
  const storage = privateTestDirectory();
  let clock = today;
  const receiver = await startLocalReceiver({
    storageDirectory: storage.directory,
    token,
    port: 0,
    now: () => clock,
  });
  try {
    const response = await handleLeadRequest(request(), {
      ...content,
      env: localEnv(receiver.url),
      now: () => clock,
    });
    assert.equal(response.status, 201);
    clock = new Date(today.getTime() + 31 * 86_400_000);
    receiver.runMaintenance();
    assert.equal(records(receiver.databasePath).length, 1);
    assert.equal(records(receiver.databasePath)[0].payload, null);
    clock = new Date(today.getTime() + 91 * 86_400_000);
    receiver.runMaintenance();
    assert.equal(records(receiver.databasePath).length, 0);
  } finally {
    await receiver.close();
    storage.dispose();
  }
});

void test("private receiver storage refuses unrelated user files and an empty directory setting", async () => {
  const storage = privateTestDirectory();
  try {
    const sentinel = join(storage.directory, "keep.txt");
    writeFileSync(sentinel, "Unrelated user file.");
    await assert.rejects(
      startLocalReceiver({
        storageDirectory: storage.directory,
        token,
        port: 0,
      }),
      /unrelated files/,
    );
    assert.equal(readFileSync(sentinel, "utf8"), "Unrelated user file.");
    await assert.rejects(
      startLocalReceiver({ storageDirectory: "", token, port: 0 }),
      /dedicated receiver storage/,
    );
  } finally {
    storage.dispose();
  }
});

void test(
  "standalone receiver processes share atomic idempotency through the same private database",
  { timeout: 15_000 },
  async () => {
    const storage = privateTestDirectory();
    const processes: ReturnType<typeof spawn>[] = [];
    const launch = async () => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", resolve("scripts/local-receiver.ts")],
        {
          cwd: process.cwd(),
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            LEADS_RECEIVER_MODE: "local-test",
            LEADS_RECEIVER_TOKEN: token,
            LEADS_LOCAL_STORAGE_DIR: storage.directory,
            LEADS_LOCAL_PORT: "0",
          },
        },
      );
      processes.push(child);
      return new Promise<string>((resolveReady, rejectReady) => {
        let output = "";
        const timer = setTimeout(
          () => rejectReady(new Error("Local receiver startup timed out.")),
          5_000,
        );
        child.once("error", () => {
          clearTimeout(timer);
          rejectReady(new Error("Local receiver could not be launched."));
        });
        child.once("exit", () => {
          clearTimeout(timer);
          rejectReady(new Error("Local receiver exited before it was ready."));
        });
        child.stdout?.on("data", (chunk: Buffer) => {
          output += chunk.toString();
          const url = output.match(/http:\/\/127\.0\.0\.1:\d+\/leads/)?.[0];
          if (url) {
            clearTimeout(timer);
            resolveReady(url);
          }
        });
      });
    };
    try {
      const urls = await Promise.all([launch(), launch()]);
      const key = randomUUID();
      const responses = await Promise.all(
        Array.from({ length: 12 }, (_, index) =>
          handleLeadRequest(request(visit, key), {
            ...content,
            env: localEnv(urls[index % 2]),
            now: () => today,
          }),
        ),
      );
      assert.equal(
        responses.filter((response) => response.status === 201).length,
        1,
      );
      assert.equal(
        responses.filter((response) => response.status === 200).length,
        11,
      );
      const receipts = await Promise.all(responses.map(acceptedBody));
      assert.equal(new Set(receipts.map((receipt) => receipt.id)).size, 1);
      assert.equal(records(join(storage.directory, "leads.sqlite")).length, 1);
    } finally {
      await Promise.all(
        processes.map(
          (child) =>
            new Promise<void>((resolveClosed) => {
              if (child.exitCode !== null || child.signalCode !== null) {
                resolveClosed();
                return;
              }
              child.once("exit", () => resolveClosed());
              child.kill();
            }),
        ),
      );
      storage.dispose();
    }
  },
);
