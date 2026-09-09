import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { getContent } from "@/lib/content";
import type { Family, Product, Store } from "@/lib/content-schema";
import { formatSchedule, getLocationHours } from "@/lib/hours";
import { legalNavigation, navigation } from "@/lib/navigation";
import { Media } from "./media";
import { TrackedLink } from "./tracked-link";

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
              {detailed ? " →" : ""}
            </>
          ) : (
            "Ver en catálogo 2026 →"
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
export function PdfAction() {
  const { pdf } = getContent();
  if (!pdf.url || pdf.status === "unavailable")
    return (
      <div className="pdf-action">
        <p className="muted">El catálogo PDF no está disponible ahora.</p>
        <Link className="text-link" href="/contacto/?motivo=producto">
          Consultar el catálogo →
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
          Descargar catálogo PDF{" "}
          {pdf.edition && <span className="muted">· {pdf.edition}</span>}
          <span aria-hidden="true">↗</span>
          <span className="screen-reader-only">, nueva pestaña</span>
        </TrackedLink>
      </Button>
      {pdf.sizeBytes && (
        <small>
          {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
            pdf.sizeBytes / 1_000_000,
          )}{" "}
          MB · Documento del negocio
        </small>
      )}
    </div>
  );
}
export function Footer() {
  const { store } = getContent();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" aria-label="Piroboom, inicio">
            <Image
              src="/brand/logo.webp"
              alt="Piroboom"
              width={120}
              height={40}
            />
          </Link>
          <p>
            Pirotecnia en Elche. Consulta artículos y opciones para tu
            celebración; visita la tienda.
          </p>
        </div>
        <div>
          <h2>Tienda Elche</h2>
          <p>{store.address}</p>
          <ul className="footer-hours">
            {formatSchedule(store.schedule).map((row) => (
              <li key={row.days}>
                {row.days}: {row.hours}
              </li>
            ))}
          </ul>
          <p className="small">
            Horario habitual publicado. Confirma festivos.
          </p>
          <TrackedLink
            href={`tel:${store.phone}`}
            event={{ name: "click_call" }}
          >
            {store.phoneDisplay}
          </TrackedLink>
        </div>
        <div>
          <h2>Secciones</h2>
          <nav aria-label="Secciones del pie">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <h2>Legal</h2>
          <nav aria-label="Información legal">
            {legalNavigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="legal-note">
            Catálogo y consulta, con atención en tienda. No se tramitan pagos ni
            envíos a domicilio desde esta web.
          </p>
        </div>
      </div>
    </footer>
  );
}
