import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, getFamily, getProduct } from "@/lib/content";
import { pageMetadata, productJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Media, ProductVideo } from "@/components/media";
import { ViewEvent } from "@/components/tracked-link";

type Props = { params: Promise<{ family: string; product: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = await params;
  const product = getProduct(route.family, route.product);
  return product
    ? pageMetadata(
        product.name,
        product.summary,
        `/catalogo-pdf/${route.family}/${product.slug}/`,
      )
    : {
        title: "Referencia no disponible",
        robots: { index: false, follow: false },
      };
}
export default async function ProductPage({ params }: Props) {
  const route = await params;
  const family = getFamily(route.family);
  const product = getProduct(route.family, route.product);
  if (!family || !product) notFound();
  const { isDemo } = getContent();
  const pathname = `/catalogo-pdf/${family.slug}/${product.slug}/`;
  return (
    <div className="container page-section catalog-page">
      {!isDemo && <JsonLd data={productJsonLd(product, family, pathname)} />}
      <Breadcrumbs
        items={[
          { label: "Catálogo", href: "/catalogo-pdf/" },
          { label: family.name, href: `/catalogo-pdf/${family.slug}/` },
          {
            label: product.name,
            href: `/catalogo-pdf/${family.slug}/${product.slug}/`,
          },
        ]}
        structuredData={!isDemo}
      />
      <div className="grid grid-2 product-detail">
        <div className="product-media">
          <Media
            src={product.image?.src}
            alt={product.image?.alt || product.name}
            ratio="1"
            priority
          />
          <ProductVideo
            src={product.video?.src}
            poster={product.video?.poster}
            caption={product.video?.caption}
            captions={product.video?.captions}
          />
        </div>
        <div>
          <div className="mono muted">
            Ref. {product.ref} · {family.name}
          </div>
          <h1>{product.name}</h1>
          <p className="product-description">{product.description}</p>
          {isDemo && (
            <p className="availability-notice">
              Referencia y atributos de demostración. No son datos técnicos
              acreditados.
            </p>
          )}
          <dl className="card attributes">
            {product.attributes.length ? (
              product.attributes.map((attribute) => (
                <div key={attribute.label}>
                  <dt>{attribute.label}</dt>
                  <dd>{attribute.value}</dd>
                </div>
              ))
            ) : (
              <div>
                <dt>Información técnica</dt>
                <dd>Consultar por esta referencia</dd>
              </div>
            )}
          </dl>
          <section className="card classification">
            <h2>Clasificación y condiciones</h2>
            <div className="tags">
              {product.classification && (
                <span className="class-tag">{product.classification}</span>
              )}
              {product.age && <span className="age-tag">{product.age}</span>}
              {product.use && <span>{product.use}</span>}
            </div>
            <p>
              {product.conditions ||
                "Consulta la clasificación y las condiciones de esta referencia con la tienda. No se deducen de su familia comercial."}
            </p>
          </section>
          <div className="grid grid-2 price-grid">
            <section className="card">
              <h2>Precio</h2>
              <p>
                {product.price == null
                  ? "Consultar en tienda"
                  : new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(product.price)}
              </p>
            </section>
            <section className="card">
              <h2>Disponibilidad</h2>
              <p>
                {product.availability === "in-stock"
                  ? "Disponible según actualización"
                  : product.availability === "out-of-stock"
                    ? "Sin disponibilidad confirmada"
                    : "Consultar"}
              </p>
            </section>
          </div>
          <p className="stock-note">
            Aparecer en el catálogo no garantiza stock en tienda. Consúltanos
            antes de venir.
          </p>
          <div className="flex-row product-actions">
            <Button asChild variant="magenta">
              <Link
                href={`/contacto/?motivo=producto&ref=${encodeURIComponent(product.ref)}`}
              >
                Consultar por este artículo
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tiendas/">Ver dónde acudir</Link>
            </Button>
          </div>
        </div>
      </div>
      <ViewEvent event={{ name: "view_product", reference: product.ref }} />
    </div>
  );
}
