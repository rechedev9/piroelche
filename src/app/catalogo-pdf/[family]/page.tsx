import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getContent, getFamily } from "@/lib/content";
import { pageMetadata, serializeJsonLd, siteUrl } from "@/lib/seo";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/site-content";
import { Media } from "@/components/media";
import { getFamilyCataloguePages, cataloguePageHref } from "@/lib/catalogue";
import { ViewEvent } from "@/components/tracked-link";

type Props = { params: Promise<{ family: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const family = getFamily((await params).family);
  return family
    ? pageMetadata(
        family.name,
        family.description,
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
          { label: family.name },
        ]}
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
          <h2 className="family-pages-heading">En el catálogo 2026</h2>
          <p>
            Abre las páginas relacionadas para ver los artículos y sus detalles.
            Algunas páginas reúnen más de un tipo de efecto.
          </p>
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
                  width={320}
                  height={559}
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
      {!isDemo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Catálogo",
                  item: `${siteUrl()}/catalogo-pdf/`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: family.name,
                  item: `${siteUrl()}/catalogo-pdf/${family.slug}/`,
                },
              ],
            }),
          }}
        />
      )}
    </div>
  );
}
