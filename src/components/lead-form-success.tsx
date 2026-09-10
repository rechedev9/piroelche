"use client";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { LeadApiResponse } from "@/lib/lead-contract";

type Props = {
  prefix: string;
  receipt: Extract<LeadApiResponse, { ok: true }>;
  onReset: () => void;
};

export function LeadFormSuccess({ prefix, receipt, onReset }: Props) {
  const success = useRef<HTMLElement>(null);
  useEffect(() => {
    success.current?.focus();
  }, []);
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
      <Button variant="outline" size="compact" type="button" onClick={onReset}>
        Enviar otra consulta
      </Button>
    </section>
  );
}
