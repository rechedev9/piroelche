import { Breadcrumbs } from "@/components/breadcrumbs";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CatalogueReader } from "@/components/catalogue-reader";
import { FamilyGrid, PdfAction } from "@/components/site-content";
import { catalogue, getCataloguePage } from "@/lib/catalogue";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Catálogo de pirotecnia",
  "Fuegos artificiales, humo de color, fuego frío, tracas y otros artículos. Consulta familias y el catálogo PDF de Piroboom.",
  "/catalogo-pdf/",
);
export default async function Catalogue({
  searchParams,
}: PageProps<"/catalogo-pdf">) {
  const selected = getCataloguePage((await searchParams).pagina);
  const preview =
    catalogue.pages.find((page) => page.familyIds?.includes("humo")) ||
    catalogue.pages[11] ||
    catalogue.pages[catalogue.pages.length - 1];
  return (
    <div className="container page-section catalog-page">
      <Breadcrumbs items={[{ label: "Catálogo" }]} />
      <section
        className="catalogue-hero dark"
        aria-labelledby="catalogue-title"
      >
        <div className="catalogue-hero-copy">
          <p className="eyebrow">
            <span className="catalogue-edition">
              Edición {catalogue.edition}
            </span>{" "}
            Catálogo Piroboom
          </p>
          <h1 id="catalogue-title">
            Tu celebración. <br />
            <span>Tu efecto.</span>
          </h1>
          <p className="catalogue-hero-description">
            Fuegos artificiales, humo de color, fuego frío y tracas. Encuentra
            ese toque que hará tu celebración única.
          </p>
          <div className="catalogue-hero-actions">
            <Button asChild variant="yellow">
              <Link href="#lector">
                Ver catálogo online <span aria-hidden="true">↓</span>
              </Link>
            </Button>
            <PdfAction compact />
          </div>
          <p className="catalogue-hero-note">
            {catalogue.pages.length} páginas para inspirarte. Consúltalas aquí o
            guarda el PDF.
          </p>
        </div>
        <Link
          href="#lector"
          className="catalogue-cover-link"
          aria-label={`Leer el catálogo Piroboom ${catalogue.edition}`}
        >
          <span className="catalogue-cover-stack">
            <Image
              className="catalogue-cover-preview"
              src={preview.thumb}
              alt=""
              width={preview.thumbWidth}
              height={preview.thumbHeight}
              sizes="180px"
              loading="eager"
            />
            <Image
              className="catalogue-cover"
              src={catalogue.cover.src}
              alt={`Portada del catálogo de pirotecnia Piroboom ${catalogue.edition}`}
              width={catalogue.cover.width}
              height={catalogue.cover.height}
              sizes="(max-width: 650px) 110px, 180px"
              preload
            />
          </span>
          <span className="catalogue-cover-caption">
            Abre el catálogo <span aria-hidden="true">↗</span>
          </span>
        </Link>
      </section>
      <CatalogueReader selected={selected} />
      <section
        id="familias"
        className="catalogue-families"
        aria-labelledby="families-title"
      >
        <div className="catalogue-family-heading">
          <div>
            <p className="eyebrow">Una idea para cada celebración</p>
            <h2 id="families-title">Explora por familias</h2>
          </div>
          <p>Descubre los distintos efectos y encuentra el tuyo.</p>
        </div>
        <FamilyGrid detailed />
      </section>
      <div className="catalogue-help">
        <div>
          <h2>¿No sabes por dónde empezar?</h2>
          <p>Cuéntanos qué celebras y te ayudamos a elegir.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/contacto/?motivo=producto">
            Consultar con Piroboom <span aria-hidden="true">↗</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
