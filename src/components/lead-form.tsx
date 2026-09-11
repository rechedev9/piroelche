"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import type { LeadField } from "@/lib/lead-contract";
import { useLeadForm, type LeadFormOptions } from "@/hooks/use-lead-form";
import {
  LeadEventFields,
  LeadFieldRow,
  leadControlProps,
} from "@/components/lead-form-fields";
import { LeadFormSuccess } from "@/components/lead-form-success";

type Props = LeadFormOptions & {
  invalidReference?: boolean;
  occasions: { id: string; label: string }[];
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
  const {
    draft,
    selectedProduct,
    errors,
    error,
    sending,
    receipt,
    ready,
    markStarted,
    update,
    changeIntention,
    removeProduct,
    submit,
    sendAnother,
  } = useLeadForm({
    variant,
    initialIntention,
    initialOccasion,
    product,
    availability,
  });
  const summary = useRef<HTMLDivElement>(null);
  const prefix = variant === "event" ? "event" : "contact";
  useEffect(() => {
    if (error || Object.keys(errors).length) summary.current?.focus();
  }, [error, errors]);
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
        // The draft owns restoration; Firefox must not restore a button's old
        // disabled state before hydration. Contact fields keep their own hints.
        autoComplete="off"
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
