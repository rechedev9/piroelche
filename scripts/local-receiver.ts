/** Local test receiver only. This file is never imported by the Next application. */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { isAbsolute, join, parse, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  IDEMPOTENCY_KEY_PATTERN,
  LEAD_BODY_LIMIT,
  validateLead,
} from "../src/lib/lead-contract";

const DAY_MS = 86_400_000;
const WINDOW_MS = 15 * 60_000;
type ReceiverOptions = {
  storageDirectory: string;
  token: string;
  port?: number;
  retentionDays?: number;
  idempotencyDays?: number;
  clientLimit?: number;
  globalLimit?: number;
  now?: () => Date;
  /** Test-only: prove recovery when a committed response is lost in transit. */
  responseDelayMs?: number;
};
type Receipt = {
  status: "stored";
  id: string;
  receivedAt: string;
  replayed: boolean;
};
type ReceiverResult = {
  status: number;
  body: Receipt | { error: string };
  retryAfter?: number;
};
const storedReceiptSchema = z.object({
  id: z.string(),
  payload_hash: z.string(),
  received_ms: z.number(),
});

function restrictDirectory(storageDirectory: string): string {
  if (!storageDirectory.trim())
    throw new Error("Choose a dedicated receiver storage directory.");
  const directory = resolve(storageDirectory);
  if (
    !isAbsolute(directory) ||
    directory === parse(directory).root ||
    directory
      .split(sep)
      .some((part) =>
        ["public", ".next", ".vercel"].includes(part.toLowerCase()),
      )
  ) {
    throw new Error(
      "Receiver storage must be a dedicated private directory outside public/build folders.",
    );
  }
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const physicalDirectory = realpathSync(directory);
  if (physicalDirectory.toLowerCase() !== directory.toLowerCase())
    throw new Error(
      "Receiver storage cannot use a symbolic link or redirected directory.",
    );
  for (const entry of readdirSync(directory)) {
    if (
      !["leads.sqlite", "leads.sqlite-journal"].includes(entry) ||
      lstatSync(join(directory, entry)).isSymbolicLink()
    ) {
      throw new Error(
        "Receiver storage must not contain unrelated files or links.",
      );
    }
  }
  if (process.platform === "win32") {
    const identity = execFileSync("whoami", ["/user", "/fo", "csv", "/nh"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const sid = identity.match(/S-1-\d+(?:-\d+)+/)?.[0];
    if (!sid)
      throw new Error("Cannot establish private Windows storage permissions.");
    execFileSync(
      "icacls",
      [
        directory,
        "/inheritance:r",
        "/grant:r",
        `*${sid}:(OI)(CI)F`,
        "*S-1-5-18:(OI)(CI)F",
      ],
      { stdio: "ignore", windowsHide: true },
    );
  } else {
    chmodSync(directory, 0o700);
  }
  return directory;
}

function authenticate(request: IncomingMessage, token: string): boolean {
  const supplied = Buffer.from(request.headers.authorization ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const contentLength = request.headers["content-length"];
  if (
    contentLength &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > LEAD_BODY_LIMIT)
  )
    throw new Error("too_large");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const rawChunk of request) {
    const incoming: unknown = rawChunk;
    if (typeof incoming !== "string" && !(incoming instanceof Uint8Array))
      throw new Error("invalid_chunk");
    const chunk =
      typeof incoming === "string" ? Buffer.from(incoming) : incoming;
    length += chunk.byteLength;
    if (length > LEAD_BODY_LIMIT) throw new Error("too_large");
    chunks.push(chunk);
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
  );
}

function send(response: ServerResponse, result: ReceiverResult): void {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(result.status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
  });
  response.end(JSON.stringify(result.body));
}

export async function startLocalReceiver(options: ReceiverOptions) {
  if (
    !options.token ||
    options.token.length < 32 ||
    options.token.length > 512 ||
    /\s/.test(options.token)
  )
    throw new Error(
      "Use a receiver token with at least 32 non-space characters.",
    );
  if (process.env.VERCEL || process.env.VERCEL_ENV)
    throw new Error("The local test receiver cannot run in Vercel.");
  const retentionDays = options.retentionDays ?? 30;
  const idempotencyDays = options.idempotencyDays ?? 90;
  const clientLimit = options.clientLimit ?? 5;
  const globalLimit = options.globalLimit ?? 100;
  if (
    !Number.isInteger(retentionDays) ||
    retentionDays < 1 ||
    retentionDays > 365 ||
    !Number.isInteger(idempotencyDays) ||
    idempotencyDays < retentionDays ||
    idempotencyDays > 365
  )
    throw new Error(
      "Retention must be 1-365 days, with idempotency retention at least as long as payload retention.",
    );
  if (
    !Number.isInteger(clientLimit) ||
    clientLimit < 1 ||
    !Number.isInteger(globalLimit) ||
    globalLimit < clientLimit
  )
    throw new Error("Invalid receiver rate limits.");
  const storageDirectory = restrictDirectory(options.storageDirectory);
  const databasePath = join(storageDirectory, "leads.sqlite");
  const database = new DatabaseSync(databasePath);
  if (process.platform !== "win32") chmodSync(databasePath, 0o600);
  database.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = FULL;
    PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS leads (
      idempotency_key TEXT PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      payload_hash TEXT NOT NULL,
      payload TEXT,
      received_ms INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS rate_buckets (
      bucket_key TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (bucket_key, window_start)
    ) STRICT;
  `);
  const now = options.now ?? (() => new Date());
  const cleanup = (timestamp: number) => {
    database
      .prepare(
        "UPDATE leads SET payload = NULL WHERE received_ms < ? AND payload IS NOT NULL",
      )
      .run(timestamp - retentionDays * DAY_MS);
    database
      .prepare("DELETE FROM leads WHERE received_ms < ?")
      .run(timestamp - idempotencyDays * DAY_MS);
    database
      .prepare("DELETE FROM rate_buckets WHERE window_start < ?")
      .run(Math.floor(timestamp / WINDOW_MS) * WINDOW_MS - WINDOW_MS);
  };
  const runMaintenance = () => {
    database.exec("BEGIN IMMEDIATE");
    try {
      cleanup(now().getTime());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  };
  runMaintenance();

  const record = (
    input: unknown,
    idempotencyKey: string,
    abuseKey: string,
  ): ReceiverResult => {
    const timestamp = now();
    const validation = validateLead(input, timestamp);
    if (!validation.success)
      return { status: 422, body: { error: "invalid_lead" } };
    const payload = JSON.stringify(validation.data);
    const payloadHash = createHash("sha256").update(payload).digest("hex");
    database.exec("BEGIN IMMEDIATE");
    try {
      cleanup(timestamp.getTime());
      const existingRow = database
        .prepare(
          "SELECT id, payload_hash, received_ms FROM leads WHERE idempotency_key = ?",
        )
        .get(idempotencyKey);
      if (existingRow) {
        const existing = storedReceiptSchema.parse(existingRow);
        database.exec("COMMIT");
        return existing.payload_hash === payloadHash
          ? {
              status: 200,
              body: {
                status: "stored",
                id: existing.id,
                receivedAt: new Date(existing.received_ms).toISOString(),
                replayed: true,
              },
            }
          : { status: 409, body: { error: "idempotency_conflict" } };
      }
      const timestampMs = timestamp.getTime();
      const windowStart = Math.floor(timestampMs / WINDOW_MS) * WINDOW_MS;
      const buckets = [
        { key: `client:${abuseKey}`, limit: clientLimit },
        { key: "global", limit: globalLimit },
      ];
      for (const bucket of buckets) {
        const row = database
          .prepare(
            "SELECT count FROM rate_buckets WHERE bucket_key = ? AND window_start = ?",
          )
          .get(bucket.key, windowStart);
        const count = row?.count ?? 0;
        if (typeof count !== "number" || !Number.isInteger(count) || count < 0)
          throw new Error("invalid_rate_bucket");
        if (count >= bucket.limit) {
          database.exec("COMMIT");
          return {
            status: 429,
            body: { error: "rate_limited" },
            retryAfter: Math.max(
              1,
              Math.ceil((windowStart + WINDOW_MS - timestampMs) / 1000),
            ),
          };
        }
      }
      const id = `PB-${randomBytes(12).toString("hex").toUpperCase()}`;
      database
        .prepare(
          "INSERT INTO leads (idempotency_key, id, payload_hash, payload, received_ms) VALUES (?, ?, ?, ?, ?)",
        )
        .run(idempotencyKey, id, payloadHash, payload, timestampMs);
      for (const bucket of buckets)
        database
          .prepare(
            "INSERT INTO rate_buckets (bucket_key, window_start, count) VALUES (?, ?, 1) ON CONFLICT (bucket_key, window_start) DO UPDATE SET count = count + 1",
          )
          .run(bucket.key, windowStart);
      database.exec("COMMIT");
      return {
        status: 201,
        body: {
          status: "stored",
          id,
          receivedAt: timestamp.toISOString(),
          replayed: false,
        },
      };
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  };

  const delayedResponses = new Set<ReturnType<typeof setTimeout>>();
  const handleRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    if (request.url !== "/leads" || request.method !== "POST")
      return send(response, { status: 404, body: { error: "not_found" } });
    if (!authenticate(request, options.token))
      return send(response, { status: 401, body: { error: "unauthorized" } });
    if (
      request.headers["x-lead-protocol"] !== "piroboom-leads-v1" ||
      !/^application\/json(?:\s*;|$)/i.test(
        request.headers["content-type"] ?? "",
      )
    )
      return send(response, {
        status: 400,
        body: { error: "invalid_protocol" },
      });
    const idempotencyKey = request.headers["idempotency-key"];
    const abuseKey = request.headers["x-lead-abuse-key"];
    if (
      typeof idempotencyKey !== "string" ||
      !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey) ||
      typeof abuseKey !== "string" ||
      !/^[a-f0-9]{64}$/.test(abuseKey)
    )
      return send(response, {
        status: 400,
        body: { error: "invalid_headers" },
      });
    let input: unknown;
    try {
      input = await readBody(request);
    } catch (error) {
      return send(response, {
        status:
          error instanceof Error && error.message === "too_large" ? 413 : 400,
        body: { error: "invalid_body" },
      });
    }
    let result: ReceiverResult;
    try {
      result = record(input, idempotencyKey, abuseKey);
    } catch {
      return send(response, {
        status: 503,
        body: { error: "storage_unavailable" },
      });
    }
    if (options.responseDelayMs && result.status === 201) {
      const timer = setTimeout(() => {
        delayedResponses.delete(timer);
        send(response, result);
      }, options.responseDelayMs);
      delayedResponses.add(timer);
    } else send(response, result);
  };
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch(() =>
      send(response, { status: 503, body: { error: "receiver_unavailable" } }),
    );
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.maxHeadersCount = 30;
  server.maxConnections = 50;
  const maintenance = setInterval(() => {
    try {
      runMaintenance();
    } catch {
      console.error(
        "Local receiver maintenance failed; inspect private storage access.",
      );
    }
  }, 60 * 60_000);
  maintenance.unref();
  try {
    await new Promise<void>((resolveListening, rejectListening) => {
      server.once("error", rejectListening);
      server.listen(options.port ?? 4010, "127.0.0.1", () => {
        server.off("error", rejectListening);
        resolveListening();
      });
    });
  } catch (error) {
    clearInterval(maintenance);
    database.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Receiver has no listening address.");
  return {
    url: `http://127.0.0.1:${address.port}/leads`,
    databasePath,
    runMaintenance,
    async close() {
      clearInterval(maintenance);
      for (const timer of delayedResponses) clearTimeout(timer);
      await new Promise<void>((resolveClosing, rejectClosing) => {
        server.close((error) =>
          error ? rejectClosing(error) : resolveClosing(),
        );
        server.closeAllConnections();
      });
      database.close();
    },
  };
}

async function main() {
  if (process.env.LEADS_RECEIVER_MODE !== "local-test")
    throw new Error(
      "Set LEADS_RECEIVER_MODE=local-test explicitly. This receiver is only for local tests.",
    );
  const token = process.env.LEADS_RECEIVER_TOKEN ?? "";
  const privateBase =
    process.env.LOCALAPPDATA?.trim() || join(process.cwd(), ".local");
  const storageDirectory =
    process.env.LEADS_LOCAL_STORAGE_DIR?.trim() ||
    join(privateBase, "Piroboom", "local-test-receiver");
  const receiver = await startLocalReceiver({
    storageDirectory,
    token,
    port: Number(process.env.LEADS_LOCAL_PORT ?? 4010),
    retentionDays: Number(process.env.LEADS_RETENTION_DAYS ?? 30),
    idempotencyDays: Number(process.env.LEADS_IDEMPOTENCY_DAYS ?? 90),
  });
  console.log(
    `Local test receiver listening at ${receiver.url}. Stored locally; no email is sent.`,
  );
  let closing = false;
  const shutdown = () => {
    if (!closing) {
      closing = true;
      void receiver.close().catch(() => {
        console.error("Local receiver shutdown failed.");
        process.exitCode = 1;
      });
    }
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const entryPath = process.argv[1] && resolve(process.argv[1]);
if (
  entryPath &&
  existsSync(entryPath) &&
  realpathSync(entryPath) === realpathSync(fileURLToPath(import.meta.url))
) {
  main().catch(() => {
    console.error(
      "Local test receiver could not start. Check its configuration and private storage permissions.",
    );
    process.exitCode = 1;
  });
}
