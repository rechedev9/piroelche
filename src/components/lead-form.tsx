"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eventRequestHref } from "@/lib/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  validateLead,
  type LeadApiResponse,
  type LeadField,
  type LeadFieldErrors,
  type LeadIntention,
  type LeadMode,
} from "@/lib/lead-contract";
import {
  clearDraft,
  fingerprintPayload,
  parseLeadResponse,
  readDraftSnapshot,
  saveDraft,
  EMPTY_DRAFT,
  type Draft,
  type Submission,
} from "@/lib/lead-draft";
import { useLeadDraft } from "@/hooks/use-lead-draft";
import {
  LeadEventFields,
  LeadFieldRow,
  leadControlProps,
} from "@/components/lead-form-fields";
import { LeadFormSuccess } from "@/components/lead-form-success";
import { track } from "@/lib/analytics";

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
  const submission = useRef<Submission | null | undefined>(undefined);
  const { saved, ready } = useLeadDraft(
    storageKey,
    useCallback(() => {
      setEditedDraft(undefined);
      submission.current = null;
    }, []),
  );
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
          ...EMPTY_DRAFT,
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
  const inFlight = useRef(false);
  const started = useRef(false);
  const summary = useRef<HTMLDivElement>(null);
  const prefix = variant === "event" ? "event" : "contact";
  useEffect(() => {
    if (error || Object.keys(errors).length) summary.current?.focus();
  }, [error, errors]);

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
      <LeadFieldRow
        prefix={prefix}
        name={name}
        label={label}
        error={errors[name]}
      >
        {control}
      </LeadFieldRow>
    );
  }
  function accessible(name: LeadField) {
    return { ...leadControlProps(prefix, errors, name), onFocus: markStarted };
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
      const hash = await fingerprintPayload(body);
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
  function sendAnother() {
    setReceipt(undefined);
    setEditedDraft({
      ...EMPTY_DRAFT,
      intention: variant === "event" ? "event" : "product",
    });
    setProductRemoved(true);
    submission.current = null;
    started.current = false;
    if (variant === "contact") router.replace("/contacto/", { scroll: false });
    else if (initialOccasion)
      router.replace(eventRequestHref(), { scroll: false });
  }
  if (receipt)
    return (
      <LeadFormSuccess
        prefix={prefix}
        receipt={receipt}
        onReset={sendAnother}
      />
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
          <LeadEventFields
            prefix={prefix}
            errors={errors}
            draft={draft}
            occasions={occasions}
            sending={sending}
            onFocus={markStarted}
            update={update}
          />
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
            autoComplete="on"
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
