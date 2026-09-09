"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { z } from "zod";
import {
  validateLead,
  type LeadApiResponse,
  type LeadField,
  type LeadFieldErrors,
  type LeadIntention,
  type LeadMode,
} from "@/lib/lead-contract";
import { track } from "@/lib/analytics";

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
type Draft = z.infer<typeof draftSchema>;
type Props = {
  variant: "contact" | "event";
  initialIntention?: LeadIntention;
  initialOccasion?: string;
  product?: { ref: string; name: string };
  invalidReference?: boolean;
  occasions: { id: string; label: string }[];
  availability: { enabled: boolean; mode: LeadMode };
  phone: string;
  phoneDisplay: string;
};
type Submission = z.infer<typeof submissionSchema>;
type Saved = z.infer<typeof savedSchema>;
const DRAFT_TTL = 30 * 60_000;
const DRAFT_EVENT = "piroboom:lead-draft";
const EMPTY: Draft = {
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
const labels: Record<LeadField, string> = {
  intention: "Motivo",
  name: "Tu nombre",
  replyTo: "Cómo te respondemos",
  message: "Tu consulta",
  productRef: "Artículo consultado",
  occasion: "Ocasión",
  date: "Fecha",
  dateUndecided: "Por definir",
  location: "Municipio o recinto",
  budget: "Presupuesto orientativo",
  website: "Formulario",
  form: "Formulario",
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
function readDraftSnapshot(key: string): string {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function parseDraftSnapshot(raw: string | null): Saved | undefined {
  if (!raw) return undefined;
  try {
    return parseSavedLeadDraft(JSON.parse(raw));
  } catch {
    return undefined;
  }
}
function subscribeDraft(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(DRAFT_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(DRAFT_EVENT, notify);
  };
}
function serverDraftSnapshot(): null {
  return null;
}
function clearDraft(key: string, expectedSnapshot?: string) {
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
function saveDraft(
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
async function fingerprint(value: string) {
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
function isLeadField(value: string): value is LeadField {
  return Object.hasOwn(labels, value);
}

export function LeadForm({
  variant,
  initialIntention,
  initialOccasion,
  product,
  invalidReference,
  occasions,
  availability,
  phone,
  phoneDisplay,
}: Props) {
  const router = useRouter();
  const storageKey = `piroboom.${variant}.draft.v1`;
  const [editedDraft, setEditedDraft] = useState<Draft>();
  const [productRemoved, setProductRemoved] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribeDraft,
    useCallback(() => readDraftSnapshot(storageKey), [storageKey]),
    serverDraftSnapshot,
  );
  const saved = useMemo(() => parseDraftSnapshot(snapshot), [snapshot]);
  const ready = snapshot !== null;
  const currentProduct = productRemoved ? undefined : product;
  const restoredIntention =
    variant === "event"
      ? "event"
      : initialIntention || saved?.draft.intention || "product";
  const contextChanged = Boolean(
    saved &&
    (saved.draft.intention !== restoredIntention ||
      (restoredIntention === "product" &&
        saved.productRef !== currentProduct?.ref) ||
      (restoredIntention === "event" &&
        initialOccasion &&
        initialOccasion !== saved.occasionContext)),
  );
  const restoredDraft =
    saved && !contextChanged
      ? saved.draft
      : {
          ...EMPTY,
          name: saved?.draft.name || "",
          replyTo: saved?.draft.replyTo || "",
        };
  const draft: Draft = editedDraft || {
    ...restoredDraft,
    intention: restoredIntention,
    occasion:
      restoredIntention === "event"
        ? contextChanged || !saved
          ? initialOccasion || ""
          : restoredDraft.occasion
        : "",
  };
  const selectedProduct =
    draft.intention === "product" ? currentProduct : undefined;
  const [errors, setErrors] = useState<LeadFieldErrors>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] =
    useState<Extract<LeadApiResponse, { ok: true }>>();
  const submission = useRef<Submission | null | undefined>(undefined);
  const inFlight = useRef(false);
  const started = useRef(false);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLElement>(null);
  const prefix = variant === "event" ? "event" : "contact";
  useEffect(() => {
    if (!snapshot) return undefined;
    if (!saved) {
      clearDraft(storageKey);
      return undefined;
    }
    const expiry = setTimeout(
      () => {
        clearDraft(storageKey);
        setEditedDraft(undefined);
        submission.current = null;
      },
      Math.max(0, saved.expires - Date.now()),
    );
    return () => clearTimeout(expiry);
  }, [snapshot, saved, storageKey]);
  useEffect(() => {
    if (error || Object.keys(errors).length) summary.current?.focus();
  }, [error, errors]);
  useEffect(() => {
    if (receipt) success.current?.focus();
  }, [receipt]);

  function currentSubmission() {
    return submission.current === undefined
      ? contextChanged
        ? undefined
        : saved?.submission
      : submission.current || undefined;
  }
  function markStarted() {
    if (!started.current) {
      started.current = true;
      track({ name: "lead_start" });
    }
  }
  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch };
    setEditedDraft(next);
    saveDraft(
      storageKey,
      next,
      currentSubmission(),
      selectedProduct?.ref,
      draft.intention === "event" ? initialOccasion : undefined,
    );
  }
  function changeIntention(intention: LeadIntention) {
    const next = {
      ...draft,
      intention,
      message: "",
      occasion: "",
      date: "",
      dateUndecided: false,
      location: "",
      budget: "",
      website: "",
    };
    setEditedDraft(next);
    setProductRemoved(true);
    saveDraft(storageKey, next);
    submission.current = null;
    setErrors({});
    setError("");
    router.replace(
      `/contacto/?motivo=${{ product: "producto", event: "evento", visit: "visita" }[intention]}`,
      { scroll: false },
    );
  }
  function removeProduct() {
    setEditedDraft(draft);
    setProductRemoved(true);
    submission.current = null;
    saveDraft(storageKey, draft);
    setErrors({});
    setError("");
    router.replace("/contacto/?motivo=producto", { scroll: false });
  }
  function field(name: LeadField, label: ReactNode, control: ReactNode) {
    return (
      <Label className="field" htmlFor={`${prefix}-${name}`}>
        <span>{label}</span>
        {control}
        {errors[name] && (
          <span className="field-error" id={`${prefix}-${name}-error`}>
            {errors[name]}
          </span>
        )}
      </Label>
    );
  }
  function accessible(name: LeadField) {
    return {
      id: `${prefix}-${name}`,
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `${prefix}-${name}-error` : undefined,
      onFocus: markStarted,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !ready) return;
    setError("");
    setErrors({});
    const common = {
      replyTo: draft.replyTo,
      message: draft.message,
      website: draft.website,
    };
    const payload =
      draft.intention === "event"
        ? {
            ...common,
            intention: "event",
            name: variant === "contact" ? draft.name : undefined,
            occasion: draft.occasion,
            date: draft.dateUndecided ? undefined : draft.date,
            dateUndecided: draft.dateUndecided,
            location: draft.location,
            budget: draft.budget,
          }
        : draft.intention === "product"
          ? {
              ...common,
              intention: "product",
              name: draft.name,
              productRef: selectedProduct?.ref,
            }
          : { ...common, intention: "visit", name: draft.name };
    const validation = validateLead(payload);
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      return;
    }
    if (!availability.enabled) {
      setError(
        "El formulario no está disponible todavía. Puedes llamar a la tienda.",
      );
      return;
    }
    inFlight.current = true;
    setSending(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const body = JSON.stringify(validation.data);
      const beforeFingerprint = readDraftSnapshot(storageKey);
      const hash = await fingerprint(body);
      if (readDraftSnapshot(storageKey) !== beforeFingerprint) return;
      const previous = currentSubmission();
      const nextSubmission =
        previous?.fingerprint === hash
          ? previous
          : { key: crypto.randomUUID(), fingerprint: hash };
      submission.current = nextSubmission;
      const sentSnapshot = saveDraft(
        storageKey,
        draft,
        nextSubmission,
        selectedProduct?.ref,
        draft.intention === "event" ? initialOccasion : undefined,
      );
      const response = await fetch("/api/leads/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": nextSubmission.key,
        },
        body,
        signal: controller.signal,
      });
      const result = parseLeadResponse(await response.json());
      if (
        result?.ok &&
        ((response.status === 201 && !result.replayed) ||
          (response.status === 200 && result.replayed))
      ) {
        setReceipt(result);
        track({ name: "lead_received" });
        setEditedDraft(undefined);
        submission.current = null;
        if (sentSnapshot !== undefined) clearDraft(storageKey, sentSnapshot);
      } else {
        track({ name: "lead_error" });
        if (result && !result.ok) {
          setError(result.message);
          if (result.fieldErrors) setErrors(result.fieldErrors);
        } else
          setError(
            "No se ha podido confirmar el registro. Tu consulta se conserva; puedes reintentar o llamar.",
          );
      }
    } catch {
      track({ name: "lead_error" });
      setError(
        "No se ha podido confirmar el registro. Tu consulta se conserva. Reintenta este mismo envío para evitar duplicados o llama a la tienda.",
      );
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      setSending(false);
    }
  }
  if (receipt)
    return (
      <section
        className="success-box"
        aria-live="polite"
        aria-atomic="true"
        aria-labelledby={`${prefix}-success`}
        tabIndex={-1}
        ref={success}
      >
        <h2 id={`${prefix}-success`}>
          {receipt.mode === "local-test"
            ? "Prueba registrada localmente"
            : "Consulta registrada"}
        </h2>
        <p>
          Referencia <strong>{receipt.id}</strong>.
        </p>
        <p>
          {receipt.mode === "local-test"
            ? "El receptor local ha guardado esta prueba. No se ha enviado ningún mensaje al negocio."
            : "El receptor ha registrado tu consulta para su atención. Este aviso no confirma lectura en el buzón, disponibilidad ni reserva."}
        </p>
        {receipt.replayed && (
          <p>Se ha recuperado el registro anterior, sin crear otra consulta.</p>
        )}
        <Button
          variant="outline"
          size="compact"
          type="button"
          onClick={() => {
            setReceipt(undefined);
            setEditedDraft({
              ...EMPTY,
              intention: variant === "event" ? "event" : "product",
            });
            setProductRemoved(true);
            submission.current = null;
            started.current = false;
            if (variant === "contact")
              router.replace("/contacto/", { scroll: false });
            else if (initialOccasion)
              router.replace("/eventos/#solicitud", { scroll: false });
          }}
        >
          Enviar otra consulta
        </Button>
      </section>
    );

  return (
    <>
      <form
        className="lead-form"
        noValidate
        onSubmit={(event) => {
          void submit(event);
        }}
        aria-label={
          variant === "event" ? "Solicitud de evento" : "Consulta a Piroboom"
        }
        aria-busy={sending}
      >
        {variant === "contact" && (
          <fieldset
            className="intent-fieldset"
            id={`${prefix}-intention`}
            disabled={sending}
          >
            <legend>Motivo</legend>
            <div className="intent-options">
              {(
                [
                  ["product", "Producto"],
                  ["event", "Evento"],
                  ["visit", "Visita / otras"],
                ] as const
              ).map(([value, label]) => (
                <Label key={value}>
                  <input
                    type="radio"
                    name="intention"
                    value={value}
                    checked={draft.intention === value}
                    onChange={() => changeIntention(value)}
                    onFocus={markStarted}
                  />
                  <span>{label}</span>
                </Label>
              ))}
            </div>
          </fieldset>
        )}
        {draft.intention === "product" &&
          (selectedProduct ? (
            <div
              className="product-context"
              id={`${prefix}-productRef`}
              tabIndex={-1}
            >
              <div>
                <span className="small muted">Artículo consultado</span>
                <div>
                  <strong>{selectedProduct.name}</strong>{" "}
                  <span className="mono muted">{selectedProduct.ref}</span>
                </div>
                {errors.productRef && (
                  <span className="field-error">{errors.productRef}</span>
                )}
              </div>
              <Button
                variant="plain"
                type="button"
                onClick={removeProduct}
                disabled={sending}
              >
                Quitar
              </Button>
            </div>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              {invalidReference &&
                "La referencia solicitada no está publicada. Puedes escribir tu consulta sin ella. "}
              ¿Tienes una referencia concreta?{" "}
              <Link href="/catalogo-pdf/">Búscala en el catálogo</Link> y
              escribe su nombre en la consulta.
            </p>
          ))}
        {draft.intention === "event" && (
          <>
            {field(
              "occasion",
              "Ocasión",
              <select
                {...accessible("occasion")}
                name="occasion"
                value={draft.occasion}
                onChange={(event) => update({ occasion: event.target.value })}
                disabled={sending}
              >
                <option value="">Elige una opción</option>
                {occasions.map((occasion) => (
                  <option key={occasion.id} value={occasion.id}>
                    {occasion.label}
                  </option>
                ))}
              </select>,
            )}
            <div className="date-row">
              {field(
                "date",
                "Fecha",
                <Input
                  {...accessible("date")}
                  type="date"
                  name="date"
                  value={draft.date}
                  disabled={sending || draft.dateUndecided}
                  onChange={(event) => update({ date: event.target.value })}
                />,
              )}
              <Label className="checkbox-label">
                <input
                  {...accessible("dateUndecided")}
                  type="checkbox"
                  checked={draft.dateUndecided}
                  disabled={sending}
                  onChange={(event) =>
                    update({
                      dateUndecided: event.target.checked,
                      date: event.target.checked ? "" : draft.date,
                    })
                  }
                />
                Por definir
              </Label>
            </div>
            {field(
              "location",
              "Municipio o recinto (si lo sabes)",
              <Input
                {...accessible("location")}
                name="location"
                type="text"
                maxLength={200}
                value={draft.location}
                onChange={(event) => update({ location: event.target.value })}
                placeholder="Municipio, recinto o por definir"
                disabled={sending}
              />,
            )}
          </>
        )}
        {variant === "contact" &&
          field(
            "name",
            draft.intention === "event" ? "Tu nombre (opcional)" : "Tu nombre",
            <Input
              {...accessible("name")}
              name="name"
              autoComplete="name"
              maxLength={100}
              value={draft.name}
              onChange={(event) => update({ name: event.target.value })}
              disabled={sending}
            />,
          )}
        {field(
          "replyTo",
          "Cómo te respondemos",
          <Input
            {...accessible("replyTo")}
            name="replyTo"
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={254}
            value={draft.replyTo}
            onChange={(event) => update({ replyTo: event.target.value })}
            placeholder="Teléfono o correo, el que prefieras"
            disabled={sending}
          />,
        )}
        {draft.intention === "event" &&
          variant === "event" &&
          field(
            "budget",
            "Presupuesto orientativo (opcional)",
            <Input
              {...accessible("budget")}
              name="budget"
              maxLength={100}
              value={draft.budget}
              onChange={(event) => update({ budget: event.target.value })}
              placeholder="p. ej. 300–500 €"
              disabled={sending}
            />,
          )}
        {variant === "contact" &&
          field(
            "message",
            draft.intention === "event"
              ? "Detalles del evento (opcional)"
              : draft.intention === "product"
                ? selectedProduct
                  ? "Qué quieres saber (opcional)"
                  : "Qué producto buscas"
                : "Tu consulta",
            <Textarea
              {...accessible("message")}
              name="message"
              rows={4}
              maxLength={4000}
              value={draft.message}
              onChange={(event) => update({ message: event.target.value })}
              disabled={sending}
            />,
          )}
        <div className="honeypot" aria-hidden="true">
          <Label>
            Deja este campo vacío
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={draft.website}
              onChange={(event) => update({ website: event.target.value })}
            />
          </Label>
        </div>
        {(error || Object.keys(errors).length > 0) && (
          <div
            className="error-summary"
            role="alert"
            tabIndex={-1}
            ref={summary}
          >
            <p>
              {error || "Revisa los campos marcados. Tu mensaje se conserva."}
            </p>
            {Object.keys(errors).length > 0 && (
              <ul>
                {Object.entries(errors).map(([key, message]) =>
                  isLeadField(key) ? (
                    <li key={key}>
                      {key === "form" || key === "website" ? (
                        <span>
                          {labels[key]}: {message}
                        </span>
                      ) : (
                        <a href={`#${prefix}-${key}`}>
                          {labels[key]}: {message}
                        </a>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </div>
        )}
        {!availability.enabled && (
          <div className="availability-notice">
            <p>
              El formulario todavía no está disponible. Puedes llamar al{" "}
              <a href={`tel:${phone}`}>{phoneDisplay}</a> para consultar.
            </p>
          </div>
        )}
        {availability.mode === "local-test" && (
          <div className="availability-notice">
            <p>
              Receptor local de pruebas. Utiliza datos de prueba; no se enviarán
              al negocio.
            </p>
          </div>
        )}
        <Button
          variant="magenta"
          type="submit"
          disabled={sending || !ready || !availability.enabled}
        >
          {sending
            ? "Enviando…"
            : variant === "event"
              ? "Enviar solicitud"
              : draft.intention === "event"
                ? "Solicitar propuesta"
                : "Enviar consulta"}
        </Button>
        <p className="form-disclosure">
          Consulta cómo se tratan tus datos en la{" "}
          <Link href="/politica-de-privacidad/">política de privacidad</Link>.
          El borrador se conserva en esta pestaña durante 30 minutos. La
          solicitud no confirma disponibilidad ni reserva.
        </p>
      </form>
      <output
        className="screen-reader-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {sending ? "Enviando tu consulta. Espera la confirmación." : ""}
      </output>
    </>
  );
}
