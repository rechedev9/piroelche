import Link from "next/link";
import { CataloguePageViewer } from "@/components/catalogue-page-viewer";
import { CatalogueIndex } from "@/components/catalogue-index";
import { CataloguePagination } from "@/components/catalogue-pagination";
import { cataloguePageHref, type CataloguePage } from "@/lib/catalogue";

export function CatalogueReader({ selected }: { selected: CataloguePage }) {
  return (
    <section
      id="lector"
      className="catalogue-reader"
      aria-labelledby="reader-title"
    >
      <div className="catalogue-reader-heading">
        <div>
          <p className="eyebrow">Encuentra tu próximo efecto</p>
          <h2 id="reader-title">El catálogo, a tu ritmo.</h2>
        </div>
        <p>
          Busca un artículo, elige una página y amplía para ver cada detalle.
        </p>
      </div>
      <nav
        className="catalogue-shortcuts"
        aria-label="Accesos rápidos del catálogo"
      >
        <span>Ir directo a</span>
        {[
          { label: "Fuegos artificiales", page: 14 },
          { label: "Humo de color", page: 12 },
          { label: "Fuego frío", page: 13 },
          { label: "Tracas y petardos", page: 8 },
        ].map((section) => (
          <Link
            key={section.page}
            href={cataloguePageHref(section.page)}
            prefetch={false}
          >
            {section.label} <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>
      <div className="catalogue-reader-layout">
        <CatalogueIndex selectedPage={selected.page} />
        <div className="catalogue-current">
          <div className="catalogue-current-toolbar">
            <CataloguePagination selectedPage={selected.page} />
          </div>
          <div className="catalogue-page-stage">
            <h3 className="catalogue-current-title">{selected.title}</h3>
            <CataloguePageViewer page={selected} />
          </div>
          <details className="catalogue-page-text">
            <summary>Leer el texto de esta página</summary>
            <p>{selected.description}</p>
            <pre>{selected.text}</pre>
          </details>
        </div>
      </div>
      <p className="catalogue-print-note">
        Catálogo original de Piroboom · Edición 2026. Consulta la vigencia de
        las condiciones y la disponibilidad antes de acudir a tienda.
      </p>
    </section>
  );
}
