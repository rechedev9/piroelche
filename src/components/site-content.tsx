import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getContent } from "@/lib/content";
import type { Family, Product, Store } from "@/lib/content-schema";
import { formatSchedule, getLocationHours } from "@/lib/hours";
import { Media } from "./media";
import { TrackedLink } from "./tracked-link";
import { catalogue } from "@/lib/catalogue";

export function Hours({ store }: { store: Store }) {
  return (
    <dl className="hours">
      {formatSchedule(store.schedule).map((row) => (
        <div key={row.days}>
          <dt>{row.days}</dt>
          <dd>{row.hours}</dd>
        </div>
      ))}
    </dl>
  );
}
export function StoreActions({
  store,
  compact = true,
}: {
  store: Store;
  compact?: boolean;
}) {
  return (
    <div className="flex-row store-actions">
      <TrackedLink
        href={store.directionsUrl}
        className={`button${compact ? " compact" : ""}`}
        event={{ name: "click_directions" }}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir ruta
        <span className="screen-reader-only">
          {" "}
          en Google Maps, nueva pestaña
        </span>
      </TrackedLink>
      <TrackedLink
        href={`tel:${store.phone}`}
        className={`button outline${compact ? " compact" : ""}`}
        event={{ name: "click_call" }}
      >
        Llamar
        <span className="screen-reader-only"> al {store.phoneDisplay}</span>
      </TrackedLink>
    </div>
  );
}
export function StoreContactCard() {
  const { store } = getContent();
  const today = getLocationHours(store);
  return (
    <div className="card contact-card">
      <div>
        <span className="small">Tienda</span>
        <p>{store.address}</p>
      </div>
      <div>
        <span className="small">
          {today.scheduleConfirmed
            ? "Hoy"
            : "Horario habitual publicado para hoy"}
        </span>
        <p>{today.todayHours}</p>
        {!today.scheduleConfirmed && (
          <span className="small">
            Confirma festivos y excepciones antes de acudir.
          </span>
        )}
      </div>
      <StoreActions store={store} />
    </div>
  );
}
export function FamilyGrid({ detailed = false }: { detailed?: boolean }) {
  const { families, products, isDemo } = getContent();
  return (
    <div
      className={`grid grid-4 ${detailed ? "catalog-families" : "family-grid"}`}
    >
      {families.map((family) => (
        <FamilyCard
          key={family.id}
          family={family}
          count={products.filter((p) => p.familyId === family.id).length}
          detailed={detailed}
          isDemo={isDemo}
        />
      ))}
    </div>
  );
}
function FamilyCard({
  family,
  count,
  detailed,
  isDemo,
}: {
  family: Family;
  count: number;
  detailed: boolean;
  isDemo: boolean;
}) {
  return (
    <Link href={`/catalogo-pdf/${family.slug}/`} className="card card-link">
      <Media
        src={family.image?.src}
        alt={family.image?.alt || family.name}
        fit={family.image?.fit}
        sizes="(max-width: 650px) 90vw, (max-width: 1059px) 45vw, 280px"
      />
      <div className="card-body">
        {detailed ? <h2>{family.name}</h2> : <h3>{family.name}</h3>}
        {detailed && <p>{family.description}</p>}
        <span className={detailed ? "text-link" : "muted small"}>
          {count || isDemo ? (
            <>
              {count}{" "}
              {isDemo
                ? "referencias de demostración"
                : "referencias publicadas"}
              {detailed && (
                <>
                  {" "}
                  <span aria-hidden="true">→</span>
                </>
              )}
            </>
          ) : (
            <>
              Ver en catálogo {catalogue.edition}{" "}
              <span aria-hidden="true">→</span>
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
export function ProductCard({
  product,
  family,
}: {
  product: Product;
  family: Family;
}) {
  return (
    <Link
      className="card card-link product-card"
      href={`/catalogo-pdf/${family.slug}/${product.slug}/`}
    >
      <Media
        src={product.image?.src}
        alt={product.image?.alt || product.name}
        ratio="1"
        sizes="(max-width: 650px) 90vw, (max-width: 1059px) 45vw, 300px"
      />
      {product.video && <span className="video-badge">VÍDEO</span>}
      <div className="card-body">
        <span className="mono muted">{product.ref}</span>
        <h2>{product.name}</h2>
        <p>{product.summary}</p>
        <div className="tags">
          {product.classification && <span>{product.classification}</span>}
          {product.age && <span>{product.age}</span>}
        </div>
      </div>
    </Link>
  );
}
export function PdfAction({ compact = false }: { compact?: boolean }) {
  const { pdf: configuredPdf } = getContent();
  const pdf =
    configuredPdf.status === "verified"
      ? {
          ...configuredPdf,
          url: catalogue.source.src,
          sizeBytes: catalogue.source.sizeBytes,
          edition: catalogue.edition,
        }
      : configuredPdf;
  if (!pdf.url || pdf.status === "unavailable")
    return (
      <div className="pdf-action">
        <p className="muted">El catálogo PDF no está disponible ahora.</p>
        <Link className="text-link" href="/contacto/?motivo=producto">
          Consultar el catálogo <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  return (
    <div className="pdf-action">
      <Button asChild variant="outline">
        <TrackedLink
          href={pdf.url}
          prefetch={false}
          event={{ name: "catalog_pdf_click" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {compact ? "Descargar PDF" : "Descargar catálogo PDF"}{" "}
          {compact && pdf.edition && (
            <span className="screen-reader-only">· {pdf.edition}</span>
          )}
          {!compact && pdf.edition && (
            <span className="muted">· {pdf.edition}</span>
          )}
          <span aria-hidden="true">↗</span>
          <span className="screen-reader-only">, nueva pestaña</span>
        </TrackedLink>
      </Button>
      {pdf.sizeBytes && (
        <small>
          {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
            pdf.sizeBytes / 1_000_000,
          )}{" "}
          MB{!compact && " · Documento del negocio"}
        </small>
      )}
    </div>
  );
}
