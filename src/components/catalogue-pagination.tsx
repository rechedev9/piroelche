"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cataloguePageHref } from "@/lib/catalogue-model";

export function CataloguePagination({
  selectedPage,
  pageCount,
  inDialog = false,
}: {
  selectedPage: number;
  pageCount: number;
  inDialog?: boolean;
}) {
  const router = useRouter();
  const previous = selectedPage > 1 ? selectedPage - 1 : undefined;
  const next = selectedPage < pageCount ? selectedPage + 1 : undefined;

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
            href={cataloguePageHref(previous)}
            prefetch={false}
            scroll={!inDialog}
            aria-label={`Página anterior, ${previous}`}
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
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ),
            )}
          </select>
        </label>
        <span aria-hidden="true">/ {pageCount}</span>
        <span className="screen-reader-only" aria-live="polite">
          Página {selectedPage} de {pageCount}
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
            href={cataloguePageHref(next)}
            prefetch={false}
            scroll={!inDialog}
            aria-label={`Página siguiente, ${next}`}
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
