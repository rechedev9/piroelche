// Validated draft snapshots. Browser storage lives in lead-draft-store.ts.
// Pure module: no React, no side effects on import, so the schemas stay testable.
import { z } from "zod";

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
export function parseDraftSnapshot(raw: string | null): Saved | undefined {
  if (!raw) return undefined;
  try {
    return parseSavedLeadDraft(JSON.parse(raw));
  } catch {
    return undefined;
  }
}
