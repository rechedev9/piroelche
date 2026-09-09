import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CataloguePageViewer } from "@/components/catalogue-page-viewer";
import {
  cataloguePages,
  cataloguePageHref,
  type CataloguePage,
} from "@/lib/catalogue";

export function CatalogueReader({ selected }: { selected: CataloguePage }) {
  const previous = cataloguePages[selected.page - 2];
  const next = cataloguePages[selected.page];
  return (
    <section
      id="lector"
      className="catalogue-reader"
      aria-labelledby="reader-title"
    >
      <div className="catalogue-reader-heading">
        <div>
          <p className="eyebrow">Edición 2026 · 16 páginas</p>
          <h2 id="reader-title">Todo el catálogo, página a página.</h2>
        </div>
        <p>Elige una sección, pasa de página o amplía para ver los detalles.</p>
      </div>
      <div className="catalogue-reader-layout">
        <details className="catalogue-index" open>
          <summary>Índice del catálogo</summary>
          <nav aria-label="Páginas del catálogo">
            <ol>
              {cataloguePages.map((page) => (
                <li key={page.page}>
                  <Link
                    href={cataloguePageHref(page.page)}
                    prefetch={false}
                    aria-current={
                      selected.page === page.page ? "page" : undefined
                    }
                  >
                    <Image src={page.thumb} alt="" width={40} height={70} />
                    <span>
                      <small>Página {page.page}</small>
                      {page.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </details>
        <div className="catalogue-current">
          <nav
            className="catalogue-pagination"
            aria-label="Cambiar página del catálogo"
          >
            {previous ? (
              <Button asChild variant="outline" size="compact">
                <Link
                  href={cataloguePageHref(previous.page)}
                  prefetch={false}
                  aria-label={`Página anterior, ${previous.page}`}
                >
                  <span aria-hidden="true">←</span> Anterior
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="compact" disabled>
                Anterior
              </Button>
            )}
            <p aria-live="polite">
              Página <strong>{selected.page}</strong> de {cataloguePages.length}
            </p>
            {next ? (
              <Button asChild size="compact">
                <Link
                  href={cataloguePageHref(next.page)}
                  prefetch={false}
                  aria-label={`Página siguiente, ${next.page}`}
                >
                  Siguiente <span aria-hidden="true">→</span>
                </Link>
              </Button>
            ) : (
              <Button size="compact" disabled>
                Siguiente
              </Button>
            )}
          </nav>
          <h3 className="catalogue-current-title">{selected.title}</h3>
          <CataloguePageViewer key={selected.page} page={selected} />
          <details className="catalogue-page-text">
            <summary>Leer el texto de esta página</summary>
            <p>{selected.description}</p>
            <pre>{selected.text}</pre>
          </details>
          <p className="catalogue-print-note">
            Documento del negocio. Consulta la vigencia de las condiciones y la
            disponibilidad antes de acudir a tienda.
          </p>
        </div>
      </div>
    </section>
  );
}
