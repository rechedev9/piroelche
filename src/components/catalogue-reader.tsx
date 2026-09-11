import Link from "next/link";
import { CataloguePageViewer } from "@/components/catalogue-page-viewer";
import { CatalogueIndex } from "@/components/catalogue-index";
import { CataloguePagination } from "@/components/catalogue-pagination";
import {
  catalogue,
  catalogueIndex,
  cataloguePageHref,
  getFamilyCataloguePages,
  type CataloguePage,
} from "@/lib/catalogue";
import { toCataloguePageImage } from "@/lib/catalogue-model";

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
          {
            label: "Fuegos artificiales",
            family: "fuegos",
            preferred: "BATERIAS AUTOMÁTICAS",
          },
          { label: "Humo de color", family: "humo" },
          { label: "Fuego frío", family: "frio" },
          { label: "Tracas y petardos", family: "tracas", preferred: "TRACAS" },
        ]
          .flatMap((section) => {
            const pages = getFamilyCataloguePages(section.family);
            const page =
              pages.find((item) => item.title === section.preferred) ||
              pages[0];
            return page ? [{ ...section, page: page.page }] : [];
          })
          .map((section) => (
            <Link
              key={section.family}
              href={cataloguePageHref(section.page)}
              prefetch={false}
            >
              {section.label} <span aria-hidden="true">↗</span>
            </Link>
          ))}
      </nav>
      <div className="catalogue-reader-layout">
        <CatalogueIndex entries={catalogueIndex} selectedPage={selected.page} />
        <div className="catalogue-current">
          <div className="catalogue-current-toolbar">
            <CataloguePagination
              selectedPage={selected.page}
              pageCount={catalogue.pages.length}
            />
          </div>
          <div className="catalogue-page-stage">
            <h3 className="catalogue-current-title">{selected.title}</h3>
            <CataloguePageViewer
              page={toCataloguePageImage(selected)}
              edition={catalogue.edition}
              pageCount={catalogue.pages.length}
            />
          </div>
          <details className="catalogue-page-text">
            <summary>Leer el texto de esta página</summary>
            <p>{selected.description}</p>
            <pre>{selected.text}</pre>
          </details>
        </div>
      </div>
      <p className="catalogue-print-note">
        Catálogo de Piroboom · Edición {catalogue.edition}. Consulta la vigencia
        de las condiciones y la disponibilidad antes de acudir a tienda.
      </p>
    </section>
  );
}
