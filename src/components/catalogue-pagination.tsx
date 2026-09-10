"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cataloguePages, cataloguePageHref } from "@/lib/catalogue";

export function CataloguePagination({
  selectedPage,
  inDialog = false,
}: {
  selectedPage: number;
  inDialog?: boolean;
}) {
  const router = useRouter();
  const previous = cataloguePages[selectedPage - 2];
  const next = cataloguePages[selectedPage];

  return (
    <nav
      className="catalogue-pagination"
      aria-label={
        inDialog ? "Cambiar página ampliada" : "Cambiar página del catálogo"
      }
    >
      {previous ? (
        <Button asChild variant="outline" size="compact">
          <Link
            href={cataloguePageHref(previous.page)}
            prefetch={false}
            scroll={!inDialog}
            aria-label={`Página anterior, ${previous.page}`}
          >
            <span aria-hidden="true">←</span> <span>Anterior</span>
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="compact" disabled>
          <span aria-hidden="true">←</span> <span>Anterior</span>
        </Button>
      )}
      <form
        action="/catalogo-pdf/#lector"
        method="get"
        className="catalogue-page-jump"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          router.push(cataloguePageHref(Number(data.get("pagina"))), {
            scroll: !inDialog,
          });
        }}
      >
        <label>
          <span className="screen-reader-only">Ir a la página</span>
          <select
            name="pagina"
            value={selectedPage}
            onChange={(event) =>
              router.push(cataloguePageHref(Number(event.target.value)), {
                scroll: !inDialog,
              })
            }
          >
            {cataloguePages.map((page) => (
              <option key={page.page} value={page.page}>
                {page.page}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden="true">/ {cataloguePages.length}</span>
        <span className="screen-reader-only" aria-live="polite">
          Página {selectedPage} de {cataloguePages.length}
        </span>
        <noscript>
          <Button size="compact" type="submit">
            Ir
          </Button>
        </noscript>
      </form>
      {next ? (
        <Button asChild size="compact">
          <Link
            href={cataloguePageHref(next.page)}
            prefetch={false}
            scroll={!inDialog}
            aria-label={`Página siguiente, ${next.page}`}
          >
            <span>Siguiente</span> <span aria-hidden="true">→</span>
          </Link>
        </Button>
      ) : (
        <Button size="compact" disabled>
          <span>Siguiente</span> <span aria-hidden="true">→</span>
        </Button>
      )}
    </nav>
  );
}
