import { Breadcrumbs } from "@/components/breadcrumbs";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CatalogueReader } from "@/components/catalogue-reader";
import { FamilyGrid, PdfAction } from "@/components/site-content";
import { getCataloguePage } from "@/lib/catalogue";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Catálogo de pirotecnia",
  "Fuegos artificiales, humo de color, fuego frío, tracas y otros artículos. Consulta familias y el catálogo PDF de Piroboom.",
  "/catalogo-pdf/",
);
export default async function Catalogue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const selected = getCataloguePage((await searchParams).pagina);
  return (
    <div className="container page-section catalog-page">
      <Breadcrumbs items={[{ label: "Catálogo" }]} />
      <section className="catalogue-hero">
        <div>
          <p className="eyebrow">Piroboom · Edición 2026</p>
          <h1>Un catálogo lleno de formas de celebrar.</h1>
          <p>
            Fuegos artificiales, humo de color, fuego frío y tracas. Descubre
            los artículos del catálogo, mira los detalles y consúltanos qué
            encaja con tu celebración.
          </p>
          <Button asChild variant="yellow">
            <Link href="#lector">Ver catálogo online</Link>
          </Button>
          <PdfAction />
        </div>
        <Link
          href="#lector"
          className="catalogue-cover-link"
          aria-label="Leer el catálogo Piroboom 2026"
        >
          <Image
            className="catalogue-cover"
            src="/media/catalogo-2026/cover.webp"
            alt="Portada del catálogo de pirotecnia Piroboom 2026"
            width={800}
            height={1398}
            sizes="245px"
          />
        </Link>
      </section>
      <div className="catalogue-family-heading">
        <p className="eyebrow">Encuentra tu efecto</p>
        <h2>Explora por familias</h2>
      </div>
      <FamilyGrid detailed />
      <CatalogueReader selected={selected} />
    </div>
  );
}
