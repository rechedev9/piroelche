"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent } from "react";

function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = event.currentTarget.querySelectorAll<HTMLElement>(
    "button:not(:disabled), a[href]",
  );
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export function CampaignPromo({ title }: { title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : document.querySelector<HTMLElement>(".skip-link");
    returnFocus.current = previous;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="campaign-dialog"
      aria-labelledby="promo-title"
      onKeyDown={keepDialogFocus}
      onClose={() => returnFocus.current?.focus()}
    >
      <Button
        variant="unstyled"
        type="button"
        aria-label="Cerrar promoción"
        className="dialog-close"
        onClick={() => dialog.current?.close()}
      >
        ×
      </Button>
      <p className="eyebrow">Campaña de temporada</p>
      <h2 id="promo-title">{title}</h2>
      <p>Consulta fechas, horarios y ubicaciones antes de venir.</p>
      <div className="flex-row">
        <Button asChild>
          <Link
            href="/tiendas/#casetas"
            onClick={() => dialog.current?.close()}
          >
            Ver casetas
          </Link>
        </Button>
        <Button variant="outline" onClick={() => dialog.current?.close()}>
          Ahora no
        </Button>
      </div>
    </dialog>
  );
}
