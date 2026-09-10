// Draft persistence and response parsing for the lead form.
// Pure module: no React, no side effects on import, so the schemas stay testable.
import { z } from "zod";
import type { LeadApiResponse } from "@/lib/lead-contract";

const draftSchema = z
  .object({
    intention: z.enum(["product", "event", "visit"]),
    name: z.string().max(100),
    replyTo: z.string().max(254),
    message: z.string().max(4000),
    occasion: z.string().max(40),
    date: z.string().max(10),
    dateUndecided: z.boolean(),
    location: z.string().max(200),
    budget: z.string().max(100),
    website: z.string().max(200),
  })
  .strict();
const submissionSchema = z
  .object({
    key: z.uuid(),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const savedSchema = z
  .object({
    expires: z.number().int().positive(),
    draft: draftSchema,
    productRef: z
      .string()
      .max(48)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    occasionContext: z.string().max(40).optional(),
    submission: submissionSchema.optional(),
  })
  .strict();
export type Draft = z.infer<typeof draftSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Saved = z.infer<typeof savedSchema>;

export const DRAFT_TTL = 30 * 60_000;
const DRAFT_EVENT = "piroboom:lead-draft";
export const EMPTY_DRAFT: Draft = {
  intention: "product",
  name: "",
  replyTo: "",
  message: "",
  occasion: "",
  date: "",
  dateUndecided: false,
  location: "",
  budget: "",
  website: "",
};

export function parseSavedLeadDraft(
  value: unknown,
  now = Date.now(),
): Saved | undefined {
  const parsed = savedSchema.safeParse(value);
  return parsed.success &&
    parsed.data.expires > now &&
    parsed.data.expires <= now + DRAFT_TTL
    ? parsed.data
    : undefined;
}
export function readDraftSnapshot(key: string): string {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
export function parseDraftSnapshot(raw: string | null): Saved | undefined {
  if (!raw) return undefined;
  try {
    return parseSavedLeadDraft(JSON.parse(raw));
  } catch {
    return undefined;
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
      return;
    sessionStorage.removeItem(key);
  } catch {
    /* Storage may be unavailable; the current form still works. */
  }
  window.dispatchEvent(new Event(DRAFT_EVENT));
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
export async function fingerprintPayload(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
const leadFieldSchema = z.enum([
  "intention",
  "name",
  "replyTo",
  "message",
  "productRef",
  "occasion",
  "date",
  "dateUndecided",
  "location",
  "budget",
  "website",
  "form",
]);
const responseSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      status: z.literal("recorded"),
      id: z.string().regex(/^PB-[A-F0-9]{24}$/),
      receivedAt: z.iso.datetime({ precision: 3 }),
      replayed: z.boolean(),
      mode: z.enum(["local-test", "remote"]),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: z.enum([
        "invalid_request",
        "validation_failed",
        "forbidden",
        "not_configured",
        "unavailable",
        "timeout",
        "rate_limited",
        "idempotency_conflict",
      ]),
      message: z.string().min(1).max(1000),
      fieldErrors: z
        .partialRecord(leadFieldSchema, z.string().max(500))
        .optional(),
    })
    .strict(),
]);
export function parseLeadResponse(value: unknown): LeadApiResponse | undefined {
  const parsed = responseSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
