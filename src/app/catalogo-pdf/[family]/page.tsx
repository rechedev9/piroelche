import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getContent, getFamily } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/site-content";
import { Media } from "@/components/media";
import {
  catalogue,
  getFamilyCataloguePages,
  cataloguePageHref,
} from "@/lib/catalogue";
import { ViewEvent } from "@/components/tracked-link";

type Props = { params: Promise<{ family: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const family = getFamily((await params).family);
  return family
    ? pageMetadata(
        `${family.name} en Elche`,
        `${family.description} Consulta esta familia en el catálogo 2026 de Piroboom, tienda de pirotecnia en Elche.`,
        `/catalogo-pdf/${family.slug}/`,
      )
    : {
        title: "Familia no encontrada",
        robots: { index: false, follow: false },
      };
}
export default async function FamilyPage({ params }: Props) {
  const family = getFamily((await params).family);
  if (!family) notFound();
  const { products: all, isDemo } = getContent();
  const products = all.filter((product) => product.familyId === family.id);
  const pages = getFamilyCataloguePages(family.id);
  return (
    <div className="container page-section catalog-page">
      <Breadcrumbs
        items={[
          { label: "Catálogo", href: "/catalogo-pdf/" },
          { label: family.name, href: `/catalogo-pdf/${family.slug}/` },
        ]}
        structuredData={!isDemo}
      />
      <section className="family-catalogue-intro">
        <div>
          <p className="eyebrow">Elige tu efecto</p>
          <h1>{family.name}</h1>
          <p className="intro">{family.description}</p>
        </div>
        <Media
          src={family.image?.src}
          alt={family.image?.alt || family.name}
          fit={family.image?.fit}
        />
      </section>
      {products.length ? (
        <div className="grid product-grid">
          {products.map((product) => (
            <ProductCard key={product.ref} product={product} family={family} />
          ))}
        </div>
      ) : (
        <>
          <h2 className="family-pages-heading">
            En el catálogo {catalogue.edition}
          </h2>
          <p>
            Abre las páginas relacionadas para ver los artículos y sus detalles.
            Algunas páginas reúnen más de un tipo de efecto.
          </p>
          {pages.length === 0 && (
            <p>
              Consulta el{" "}
              <Link href="/catalogo-pdf/#lector">catálogo completo</Link> para
              encontrar esta familia.
            </p>
          )}
          <div className="family-pages-grid">
            {pages.map((page) => (
              <Link
                key={page.page}
                className="family-page-card"
                href={cataloguePageHref(page.page)}
                prefetch={false}
              >
                <Image
                  src={page.thumb}
                  alt={`Vista de la página ${page.page}: ${page.title}`}
                  width={page.thumbWidth}
                  height={page.thumbHeight}
                  sizes="(max-width:650px) 85vw, 320px"
                />
                <small>Página {page.page}</small>
                <h3>{page.title}</h3>
                <span className="text-link">Ver esta página →</span>
              </Link>
            ))}
          </div>
          <div className="family-consult">
            <p>
              ¿Ya tienes un artículo en mente? Consúltanos sus condiciones y
              disponibilidad.
            </p>
            <Link className="text-link" href="/contacto/?motivo=producto">
              Pregúntanos por un artículo →
            </Link>
          </div>
        </>
      )}
      <ViewEvent event={{ name: "view_category", category: family.id }} />
    </div>
  );
}
