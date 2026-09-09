import { createHmac } from "node:crypto";
import {
  IDEMPOTENCY_KEY_PATTERN,
  LEAD_BODY_LIMIT,
  type LeadApiResponse,
  type LeadMode,
  validateLead,
} from "./lead-contract";

type LeadEnvironment = Record<string, string | undefined>;
type ReceiverConfig = {
  mode: "local-test" | "remote";
  url: URL;
  token: string;
  allowedOrigins: string[];
  timeoutMs: number;
};
type LeadDependencies = {
  env?: LeadEnvironment;
  now?: () => Date;
  fetch?: typeof globalThis.fetch;
  getProductByRef: (ref: string) => { ref: string; name: string } | undefined;
};

function isLoopback(url: URL): boolean {
  return ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
}

function receiverConfig(env: LeadEnvironment): ReceiverConfig | undefined {
  const mode = env.LEADS_RECEIVER_MODE;
  if (mode !== "local-test" && mode !== "remote") return undefined;
  const token = env.LEADS_RECEIVER_TOKEN;
  if (!token || token.length < 32 || token.length > 512 || /\s/.test(token))
    return undefined;
  try {
    const url = new URL(env.LEADS_RECEIVER_URL ?? "");
    if (url.username || url.password || url.hash || url.search)
      return undefined;
    if (
      mode === "local-test" &&
      (env.VERCEL ||
        env.VERCEL_ENV ||
        url.protocol !== "http:" ||
        !isLoopback(url))
    )
      return undefined;
    if (mode === "remote" && (url.protocol !== "https:" || isLoopback(url)))
      return undefined;
    const allowedOrigins = (env.LEADS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (mode === "remote" && !allowedOrigins.length) return undefined;
    for (const origin of allowedOrigins) {
      const parsed = new URL(origin);
      if (
        parsed.origin !== origin ||
        parsed.username ||
        parsed.password ||
        (mode === "remote" && parsed.protocol !== "https:") ||
        !["https:", "http:"].includes(parsed.protocol)
      )
        return undefined;
    }
    const timeoutMs = Number(env.LEADS_RECEIVER_TIMEOUT_MS ?? 8_000);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 15_000)
      return undefined;
    return { mode, url, token, allowedOrigins, timeoutMs };
  } catch {
    return undefined;
  }
}

/** Call from a server component; only this deliberately small result may go to the client. */
export function getLeadAvailability(env: LeadEnvironment = process.env): {
  enabled: boolean;
  mode: LeadMode;
} {
  const config = receiverConfig(env);
  return config
    ? { enabled: true, mode: config.mode }
    : { enabled: false, mode: "disabled" };
}

function respond(
  status: number,
  body: LeadApiResponse,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

class BodyTooLarge extends Error {}

async function limitedJson(
  request: Pick<Request, "headers" | "body">,
  limit = LEAD_BODY_LIMIT,
): Promise<unknown> {
  const size = request.headers.get("content-length");
  if (size && (!/^\d+$/.test(size) || Number(size) > limit))
    throw new BodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("missing_body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new BodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function acceptsOrigin(request: Request, config: ReceiverConfig): boolean {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  if (config.mode === "local-test" && !isLoopback(requestUrl)) return false;
  if (config.allowedOrigins.length)
    return config.allowedOrigins.includes(origin);
  return (
    config.mode === "local-test" &&
    isLoopback(requestUrl) &&
    origin === requestUrl.origin
  );
}

function abuseKey(
  request: Request,
  env: LeadEnvironment,
  token: string,
): string {
  // Vercel overwrites this header. Self-hosted deployments must explicitly trust a proxy.
  const address = env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")
    : env.LEADS_TRUST_PROXY === "1"
      ? request.headers.get("x-forwarded-for")
      : "local-or-untrusted-proxy";
  const client = (address?.split(",")[0]?.trim() || "unknown").slice(0, 200);
  return createHmac("sha256", token)
    .update(`lead-abuse-v1:${client}`)
    .digest("hex");
}

function isReceipt(
  value: unknown,
): value is {
  status: "stored";
  id: string;
  receivedAt: string;
  replayed: boolean;
} {
  if (!value || typeof value !== "object") return false;
  return (
    "status" in value &&
    value.status === "stored" &&
    "id" in value &&
    typeof value.id === "string" &&
    /^PB-[A-F0-9]{24}$/.test(value.id) &&
    "receivedAt" in value &&
    typeof value.receivedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.receivedAt) &&
    Number.isFinite(Date.parse(value.receivedAt)) &&
    "replayed" in value &&
    typeof value.replayed === "boolean"
  );
}

/** No local filesystem writes: safe for stateless Next/Vercel instances. */
export async function handleLeadRequest(
  request: Request,
  dependencies: LeadDependencies,
): Promise<Response> {
  const env = dependencies.env ?? process.env;
  const config = receiverConfig(env);
  if (!config)
    return respond(503, {
      ok: false,
      code: "not_configured",
      message:
        "El formulario no está disponible todavía. Puedes contactar por teléfono con la tienda.",
    });
  if (!acceptsOrigin(request, config))
    return respond(403, {
      ok: false,
      code: "forbidden",
      message:
        "No se ha podido verificar el origen del formulario. Recarga la página.",
    });
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    return respond(415, {
      ok: false,
      code: "invalid_request",
      message: "El formulario debe enviarse como JSON.",
    });
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey))
    return respond(400, {
      ok: false,
      code: "invalid_request",
      message:
        "Falta el identificador de envío. Recarga la página antes de enviar.",
    });
  let input: unknown;
  try {
    input = await limitedJson(request);
  } catch (error) {
    return respond(error instanceof BodyTooLarge ? 413 : 400, {
      ok: false,
      code: "invalid_request",
      message:
        "No se ha podido leer el formulario o supera el tamaño permitido.",
    });
  }
  const validation = validateLead(input, dependencies.now?.() ?? new Date());
  if (!validation.success)
    return respond(422, {
      ok: false,
      code: "validation_failed",
      message: "Revisa los campos indicados. Tu mensaje se conserva.",
      fieldErrors: validation.fieldErrors,
    });
  if (
    validation.data.intention === "product" &&
    validation.data.productRef &&
    !dependencies.getProductByRef(validation.data.productRef)
  ) {
    return respond(422, {
      ok: false,
      code: "validation_failed",
      message:
        "La referencia ya no está disponible para consulta. Puedes quitarla y escribir tu pregunta.",
      fieldErrors: {
        productRef:
          "Esta referencia no está publicada. Quita el artículo para continuar.",
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const provider = await (dependencies.fetch ?? globalThis.fetch)(
      config.url,
      {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
          "Idempotency-Key": idempotencyKey,
          "X-Lead-Abuse-Key": abuseKey(request, env, config.token),
          "X-Lead-Protocol": "piroboom-leads-v1",
        },
        body: JSON.stringify(validation.data),
      },
    );
    if (provider.status === 409)
      return respond(409, {
        ok: false,
        code: "idempotency_conflict",
        message:
          "Este identificador corresponde a otro envío. Revisa el formulario antes de volver a enviarlo.",
      });
    if (provider.status === 429) {
      const retryHeader = provider.headers.get("retry-after");
      const retryAfter =
        retryHeader && /^\d+$/.test(retryHeader)
          ? String(Math.max(1, Math.min(3_600, Number(retryHeader))))
          : "900";
      return respond(
        429,
        {
          ok: false,
          code: "rate_limited",
          message:
            "Has enviado varias solicitudes. Espera unos minutos y reintenta con el mismo formulario.",
        },
        { "Retry-After": retryAfter },
      );
    }
    if (provider.status !== 200 && provider.status !== 201)
      throw new Error("receiver_rejected");
    const receipt = await limitedJson(provider, 2_048);
    if (!isReceipt(receipt) || (provider.status === 200) !== receipt.replayed)
      throw new Error("invalid_receipt");
    return respond(receipt.replayed ? 200 : 201, {
      ok: true,
      status: "recorded",
      id: receipt.id,
      receivedAt: receipt.receivedAt,
      replayed: receipt.replayed,
      mode: config.mode,
    });
  } catch {
    return controller.signal.aborted
      ? respond(504, {
          ok: false,
          code: "timeout",
          message:
            "No hemos podido confirmar el registro a tiempo. Conserva el formulario y reintenta con el mismo envío para evitar duplicados.",
        })
      : respond(503, {
          ok: false,
          code: "unavailable",
          message:
            "No hemos podido confirmar el registro. Tus datos se conservan; puedes reintentar o llamar a la tienda.",
        });
  } finally {
    clearTimeout(timeout);
  }
}
