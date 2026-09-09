import { z } from "zod";

export const LEAD_OCCASIONS = [
  "boda",
  "revelacion",
  "cumpleanos",
  "fiesta",
  "otra",
] as const;
export const LEAD_BODY_LIMIT = 16_384;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function hasControlCharacters(value: string, multiline = false): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (
      code === 127 ||
      (code < 32 && !(multiline && [9, 10, 13].includes(code)))
    )
      return true;
  }
  return false;
}

const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usa como máximo ${max} caracteres.`)
    .refine(
      (value) => !hasControlCharacters(value),
      "Escribe este dato en una sola línea.",
    );
const message = z
  .string()
  .trim()
  .max(4_000, "Usa como máximo 4000 caracteres.")
  .refine(
    (value) => !hasControlCharacters(value, true),
    "El mensaje contiene caracteres no admitidos.",
  )
  .optional();

export function normalizeReplyTo(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || hasControlCharacters(trimmed)) return undefined;
  if (trimmed.includes("@")) {
    if (!z.email().safeParse(trimmed).success) return undefined;
    const separator = trimmed.lastIndexOf("@");
    return `${trimmed.slice(0, separator)}@${trimmed.slice(separator + 1).toLowerCase()}`;
  }
  if (!/^\+?[\d\s()./-]+$/.test(trimmed)) return undefined;
  const compact = trimmed.replace(/[\s()./-]/g, "").replace(/^00/, "+");
  if (!/^\+?\d{7,15}$/.test(compact)) return undefined;
  return compact;
}

const replyTo = singleLine(254)
  .min(1, "Escribe un correo electrónico o teléfono.")
  .refine(
    (value) => Boolean(normalizeReplyTo(value)),
    "Escribe un correo electrónico o teléfono válido.",
  )
  .transform((value) => normalizeReplyTo(value)!);
const common = {
  replyTo,
  message,
  website: singleLine(200)
    .max(0, "No se ha podido validar el formulario. Vuelve a intentarlo.")
    .optional(),
};
const requiredName = singleLine(100).min(1, "Escribe tu nombre.");

/** The client and both servers share this structural contract. Date freshness is checked separately. */
export const leadSchema = z.discriminatedUnion("intention", [
  z
    .object({
      intention: z.literal("product"),
      name: requiredName,
      ...common,
      productRef: singleLine(48)
        .regex(/^[A-Za-z0-9_-]*$/, "La referencia no es válida.")
        .optional(),
    })
    .strict(),
  z
    .object({
      intention: z.literal("event"),
      name: singleLine(100).optional(),
      ...common,
      occasion: z.enum(LEAD_OCCASIONS, { error: "Elige una ocasión." }),
      date: singleLine(10).optional(),
      dateUndecided: z.boolean({
        error: "Indica la fecha o marca Por definir.",
      }),
      location: singleLine(200).optional(),
      budget: singleLine(100).optional(),
    })
    .strict(),
  z
    .object({
      intention: z.literal("visit"),
      name: requiredName,
      ...common,
    })
    .strict(),
]);

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadIntention = LeadInput["intention"];
export type LeadOccasion = (typeof LEAD_OCCASIONS)[number];
export type LeadField =
  | "intention"
  | "name"
  | "replyTo"
  | "message"
  | "productRef"
  | "occasion"
  | "date"
  | "dateUndecided"
  | "location"
  | "budget"
  | "website"
  | "form";
export type LeadFieldErrors = Partial<Record<LeadField, string>>;
export type LeadValidation =
  | { success: true; data: LeadInput }
  | { success: false; fieldErrors: LeadFieldErrors };
export type LeadMode = "disabled" | "local-test" | "remote";
export type LeadErrorCode =
  | "invalid_request"
  | "validation_failed"
  | "forbidden"
  | "not_configured"
  | "unavailable"
  | "timeout"
  | "rate_limited"
  | "idempotency_conflict";
export type LeadApiResponse =
  | {
      ok: true;
      status: "recorded";
      id: string;
      receivedAt: string;
      replayed: boolean;
      mode: Exclude<LeadMode, "disabled">;
    }
  | {
      ok: false;
      code: LeadErrorCode;
      message: string;
      fieldErrors?: LeadFieldErrors;
    };

const fieldNames = new Set<string>([
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
]);
function isLeadField(value: unknown): value is LeadField {
  return typeof value === "string" && fieldNames.has(value);
}

export function madridDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validateLead(input: unknown, now = new Date()): LeadValidation {
  const result = leadSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: LeadFieldErrors = {};
    for (const issue of result.error.issues) {
      const candidate = issue.path[0];
      const field = isLeadField(candidate) ? candidate : "form";
      fieldErrors[field] ??=
        issue.code === "unrecognized_keys"
          ? "El formulario contiene campos que no corresponden a este motivo."
          : issue.message;
    }
    return { success: false, fieldErrors };
  }
  const data = result.data;
  const fieldErrors: LeadFieldErrors = {};
  if (
    data.intention === "visit" ||
    (data.intention === "product" && !data.productRef)
  ) {
    if (!data.message)
      fieldErrors.message =
        data.intention === "product"
          ? "Cuéntanos qué producto buscas."
          : "Escribe tu consulta para poder ayudarte.";
  }
  if (data.intention === "event") {
    if (data.dateUndecided) {
      if (data.date)
        fieldErrors.date = "Quita la fecha si todavía está por definir.";
    } else if (!data.date) {
      fieldErrors.date = "Indica una fecha o marca Por definir.";
    } else {
      const date = new Date(`${data.date}T12:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== data.date
      ) {
        fieldErrors.date = "Escribe una fecha válida.";
      } else if (data.date < madridDate(now)) {
        fieldErrors.date =
          "La fecha no puede ser anterior a hoy (hora de Madrid).";
      }
    }
  }
  return Object.keys(fieldErrors).length
    ? { success: false, fieldErrors }
    : { success: true, data };
}
