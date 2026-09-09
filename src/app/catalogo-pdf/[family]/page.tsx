import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, getFamily } from "@/lib/content";
import { pageMetadata, serializeJsonLd, siteUrl } from "@/lib/seo";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/site-content";
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
  return (
    <div className="container page-section catalog-page">
      <Breadcrumbs
        items={[
          { label: "Catálogo", href: "/catalogo-pdf/" },
          { label: family.name },
        ]}
      />
      <h1>{family.name}</h1>
      <p className="intro" style={{ marginBottom: 28 }}>
        {family.description}
      </p>
      {products.length ? (
        <div className="grid product-grid">
          {products.map((product) => (
            <ProductCard key={product.ref} product={product} family={family} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No hay referencias publicadas en esta familia ahora mismo.</p>
          <Link className="text-link" href="/contacto/?motivo=producto">
            Pregúntanos por un artículo →
          </Link>
        </div>
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
