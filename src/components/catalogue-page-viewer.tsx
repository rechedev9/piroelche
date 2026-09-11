"use client";

import Image from "next/image";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CataloguePagination } from "@/components/catalogue-pagination";
import type { CataloguePageImage } from "@/lib/catalogue-model";

export function CataloguePageViewer({
  page,
  edition,
  pageCount,
}: {
  page: CataloguePageImage;
  edition: string;
  pageCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(false);
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
          setFitWidth(false);
          setOpen(true);
        }}
      >
        {/* The reader shows the sheet at ~370px wide (max-height 640px), so let
            the optimizer serve a responsive size; only the zoom dialog below
            needs the full 1600px source. */}
        <Image
          className="catalogue-sheet"
          src={page.src}
          alt={label}
          width={page.width}
          height={page.height}
          sizes="(max-width: 650px) 85vw, 400px"
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
                <Dialog.Title aria-live="polite">{label}</Dialog.Title>
                <Dialog.Description>
                  Catálogo Piroboom {edition} · Amplía para leer los detalles
                </Dialog.Description>
              </div>
              <div className="catalogue-zoom-controls">
                <Button
                  variant="outline"
                  size="compact"
                  className="catalogue-fit-button"
                  onClick={() => {
                    setFitWidth((current) => !current);
                    setZoom(1);
                  }}
                >
                  {fitWidth ? "Ver página completa" : "Ajustar al ancho"}
                </Button>
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
                  <Button size="compact">
                    Cerrar <span aria-hidden="true">×</span>
                  </Button>
                </Dialog.Close>
              </div>
            </div>
            <section
              key={`${page.page}-${fitWidth}`}
              className="catalogue-zoom-scroll"
              // Keyboard focus allows scrolling the enlarged page with arrow keys.
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              aria-label="Página ampliada"
            >
              <div className="catalogue-zoom-canvas">
                <Image
                  src={page.src}
                  alt={label}
                  width={page.width}
                  height={page.height}
                  unoptimized
                  style={{
                    width: fitWidth
                      ? `calc(100cqw * ${zoom})`
                      : `calc(min(100cqw, 100cqh * ${page.width / page.height}) * ${zoom})`,
                    maxWidth: "none",
                    height: "auto",
                  }}
                />
              </div>
            </section>
            <div className="catalogue-zoom-footer">
              <CataloguePagination
                selectedPage={page.page}
                pageCount={pageCount}
                inDialog
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
