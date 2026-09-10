"use client";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LeadField, LeadFieldErrors } from "@/lib/lead-contract";
import type { Draft } from "@/lib/lead-draft";

/** Ids and error wiring shared by every control, so labels and anchors stay paired. */
export function leadControlProps(
  prefix: string,
  errors: LeadFieldErrors,
  name: LeadField,
) {
  const id = `${prefix}-${name}`;
  return {
    id,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${id}-error` : undefined,
  };
}

/**
 * Label, control and error message are siblings: keeping the error outside the
 * label leaves the control's accessible name as the label text alone.
 */
export function LeadFieldRow({
  prefix,
  name,
  label,
  error,
  children,
}: {
  prefix: string;
  name: LeadField;
  label: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  const id = `${prefix}-${name}`;
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function LeadEventFields({
  prefix,
  errors,
  draft,
  occasions,
  sending,
  onFocus,
  update,
}: {
  prefix: string;
  errors: LeadFieldErrors;
  draft: Draft;
  occasions: { id: string; label: string }[];
  sending: boolean;
  onFocus: () => void;
  update: (patch: Partial<Draft>) => void;
}) {
  return (
    <>
      <LeadFieldRow
        prefix={prefix}
        name="occasion"
        label="Ocasión"
        error={errors.occasion}
      >
        <select
          {...leadControlProps(prefix, errors, "occasion")}
          onFocus={onFocus}
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
        </select>
      </LeadFieldRow>
      <div className="date-row">
        <LeadFieldRow
          prefix={prefix}
          name="date"
          label="Fecha"
          error={errors.date}
        >
          <Input
            {...leadControlProps(prefix, errors, "date")}
            onFocus={onFocus}
            type="date"
            name="date"
            value={draft.date}
            disabled={sending || draft.dateUndecided}
            onChange={(event) => update({ date: event.target.value })}
          />
        </LeadFieldRow>
        <Label className="checkbox-label">
          <input
            {...leadControlProps(prefix, errors, "dateUndecided")}
            onFocus={onFocus}
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
      <LeadFieldRow
        prefix={prefix}
        name="location"
        label="Municipio o recinto (si lo sabes)"
        error={errors.location}
      >
        <Input
          {...leadControlProps(prefix, errors, "location")}
          onFocus={onFocus}
          name="location"
          type="text"
          maxLength={200}
          value={draft.location}
          onChange={(event) => update({ location: event.target.value })}
          placeholder="Municipio, recinto o por definir"
          disabled={sending}
        />
      </LeadFieldRow>
    </>
  );
}
