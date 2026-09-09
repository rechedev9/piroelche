"use client";

import Image from "next/image";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CataloguePage } from "@/lib/catalogue";

export function CataloguePageViewer({ page }: { page: CataloguePage }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const trigger = useRef<HTMLAnchorElement>(null);
  const label = `Página ${page.page}: ${page.title}`;
  return (
    <>
      <a
        ref={trigger}
        href={page.src}
        target="_blank"
        rel="noopener noreferrer"
        className="catalogue-sheet-link"
        aria-label={`Ampliar página ${page.page}: ${page.title}`}
        onClick={(event) => {
          event.preventDefault();
          setZoom(1);
          setOpen(true);
        }}
      >
        <Image
          className="catalogue-sheet"
          src={page.src}
          alt={label}
          width={page.width}
          height={page.height}
          unoptimized
        />
        <span className="catalogue-enlarge">
          Ampliar página <span aria-hidden="true">↗</span>
        </span>
      </a>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="catalogue-overlay" />
          <Dialog.Content
            className="catalogue-zoom-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
          >
            <div className="catalogue-zoom-toolbar">
              <div>
                <Dialog.Title>{label}</Dialog.Title>
                <Dialog.Description>Catálogo Piroboom 2026</Dialog.Description>
              </div>
              <div className="catalogue-zoom-controls">
                <Button
                  variant="outline"
                  size="compact"
                  aria-label="Reducir ampliación"
                  disabled={zoom === 1}
                  onClick={() =>
                    setZoom((current) => Math.max(1, current - 0.5))
                  }
                >
                  −
                </Button>
                <output aria-live="polite">{zoom}×</output>
                <Button
                  variant="outline"
                  size="compact"
                  aria-label="Aumentar ampliación"
                  disabled={zoom === 3}
                  onClick={() =>
                    setZoom((current) => Math.min(3, current + 0.5))
                  }
                >
                  +
                </Button>
                <Dialog.Close asChild>
                  <Button size="compact">Cerrar</Button>
                </Dialog.Close>
              </div>
            </div>
            <section
              className="catalogue-zoom-scroll"
              // Keyboard focus allows scrolling the enlarged page with arrow keys.
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              aria-label="Página ampliada"
            >
              <Image
                src={page.src}
                alt={label}
                width={page.width}
                height={page.height}
                unoptimized
                style={{
                  width: `${zoom * 100}%`,
                  maxWidth: "none",
                  height: "auto",
                }}
              />
            </section>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
