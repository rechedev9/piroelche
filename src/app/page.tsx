import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getContent } from "@/lib/content";
import { getLocationHours } from "@/lib/hours";
import { eventRequestHref } from "@/lib/navigation";
import { pageMetadata } from "@/lib/seo";
import { FamilyGrid, Hours } from "@/components/site-content";
import { Media } from "@/components/media";
import { TrackedLink } from "@/components/tracked-link";
import { CampaignPromo } from "@/components/campaign-promo";
import { HeroImage } from "@/components/hero-image";

export const metadata = pageMetadata(
  "Pirotecnia para tus celebraciones en Elche",
  "Explora las familias de pirotecnia, consulta opciones para tu evento y encuentra la tienda Piroboom en Elche.",
  "/",
);
export default function Home() {
  const { brand, store, solutions, campaigns } = getContent();
  const heroImage = brand?.hero || store.image;
  const productImage = brand?.storeDetail || store.image;
  const eventImage =
    brand?.eventHero || solutions.find((item) => item.image)?.image;
  const today = getLocationHours(store);
  const promo =
    process.env.PIROBOOM_PROMO === "1" &&
    campaigns.find(
      (campaign) => getLocationHours(campaign).campaignStatus === "active",
    );
  return (
    <div className="brand-home">
      <section className="hero brand-hero">
        <div className="container hero-inner">
          <div className="brand-hero-copy">
            <p className="eyebrow brand-eyebrow">Tienda física · Elche</p>
            <h1>
              Pirotecnia para{" "}
              <span className="brand-hero-accent">tus celebraciones</span>{" "}
              en Elche.
            </h1>
            <p className="lead">
              Explora el catálogo y consulta las opciones para tu evento. Te
              ayudamos a elegir según el producto, el lugar y las condiciones de
              uso.
            </p>
            <div className="flex-row brand-hero-actions">
              <Button asChild variant="yellow">
                <TrackedLink
                  href="/catalogo-pdf/"
                  event={{ name: "select_journey", journey: "product" }}
                >
                  Explorar catálogo
                  <span aria-hidden="true">↗</span>
                </TrackedLink>
              </Button>
              <TrackedLink
                className="brand-hero-secondary"
                href="/eventos/"
                event={{ name: "select_journey", journey: "event" }}
              >
                Planificar mi evento
                <span aria-hidden="true">→</span>
              </TrackedLink>
            </div>
            <div className="today brand-hero-store">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <div className="brand-hero-store-copy">
                <span>
                  Tienda Elche ·{" "}
                  {today.scheduleConfirmed
                    ? `hoy ${today.todayHours}`
                    : "consulta el horario antes de venir"}
                </span>
                <Link href="/tiendas/">Horarios y cómo llegar</Link>
              </div>
            </div>
          </div>
          <HeroImage
            src={heroImage?.src}
            alt={heroImage?.alt || "Piroboom en Elche"}
            label="Piroboom · Elche"
            caption="Luz, color y celebración"
          />
        </div>
      </section>
      <section className="container section">
        <h2 className="section-heading brand-section-heading">
          ¿Por dónde empezamos?
        </h2>
        <p className="section-intro">
          Dos formas de explorar, según lo que ya tengas claro.
        </p>
        <div className="grid grid-2 brand-journeys">
          <TrackedLink
            href="/catalogo-pdf/"
            className="card card-link journey brand-journey"
            event={{ name: "select_journey", journey: "product" }}
          >
            <Media
              src={productImage?.src}
              alt={productImage?.alt || "Artículos en la tienda Piroboom"}
              ratio="16 / 9"
              fit={productImage?.fit}
            />
            <div className="brand-journey-copy">
              <span className="eyebrow">Sé qué producto busco</span>
              <h3>Ver productos por familias</h3>
              <p className="muted">
                Fuegos artificiales, humo de color, fuego frío, tracas. Consulta
                cada referencia y dónde adquirirla.
              </p>
              <span className="text-link">Explorar catálogo →</span>
            </div>
          </TrackedLink>
          <TrackedLink
            href="/eventos/"
            className="card card-link journey brand-journey"
            event={{ name: "select_journey", journey: "event" }}
          >
            <Media
              src={eventImage?.src}
              alt={eventImage?.alt || "Ideas para celebraciones"}
              ratio="16 / 9"
              fit={eventImage?.fit}
            />
            <div className="brand-journey-copy">
              <span className="eyebrow">Sé qué quiero celebrar</span>
              <h3>Cuéntanos el evento y te proponemos</h3>
              <p className="muted">
                Bodas, revelaciones, cumpleaños, fiestas. Valoramos qué encaja
                con tu lugar y tu fecha.
              </p>
              <span className="text-link">Planificar mi evento →</span>
            </div>
          </TrackedLink>
        </div>
      </section>
      <section className="container section">
        <div className="spread">
          <h2 className="section-heading brand-section-heading">
            Familias de producto
          </h2>
          <Link className="text-link" href="/catalogo-pdf/">
            Ver todo el catálogo →
          </Link>
        </div>
        <FamilyGrid />
      </section>
      <section className="dark events-band brand-events-band">
        <div className="container">
          <div className="spread">
            <h2>Soluciones para eventos</h2>
            <Link className="text-link" href="/eventos/">
              Ver opciones para tu evento →
            </Link>
          </div>
          <div className="grid grid-3">
            {solutions.map((solution) => (
              <Link
                key={solution.id}
                href={eventRequestHref(solution.occasionId)}
                className="card card-link solution-compact brand-solution-teaser"
              >
                <Media
                  src={solution.image?.src}
                  alt={solution.image?.alt || solution.label}
                  ratio="4 / 3"
                  fit={solution.image?.fit}
                  dark
                />
                <div className="brand-teaser-copy">
                  <span className="eyebrow">{solution.label}</span>
                  <h3>{solution.title}</h3>
                  <p>{solution.result}</p>
                  <span className="text-link">Ver opciones →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container section store-trust brand-visit">
        <div className="brand-visit-grid">
          <figure className="brand-visit-photo">
            <Media
              src={store.image?.src}
              alt={store.image?.alt || "Interior de Piroboom en Elche"}
              ratio="4 / 3"
            />
            <figcaption>Ven a la tienda</figcaption>
          </figure>
          <div className="card card-pad brand-store-panel">
            <p className="eyebrow brand-eyebrow">Tu punto de encuentro</p>
            <h2>Tienda en Elche</h2>
            <p className="muted">{store.address}</p>
            <Hours store={store} />
            <div className="flex-row store-actions">
              <Button asChild size="compact">
                <Link href="/tiendas/">Cómo llegar</Link>
              </Button>
              <Button asChild variant="outline" size="compact">
                <Link href="/tiendas/#casetas">Casetas de temporada</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="trust brand-trust">
          <h2>Por qué confiar</h2>
          <ul>
            <li>
              <div>
                <h3>Tienda física en Elche</h3>
                <p>
                  Un punto de atención para consultar artículos y resolver dudas
                  antes de elegir.
                </p>
              </div>
            </li>
            <li>
              <div>
                <h3>Consulta online, atención en tienda</h3>
                <p>
                  Infórmate antes de acudir. Esta web no tramita envíos de
                  artículos pirotécnicos a domicilio.
                </p>
              </div>
            </li>
            <li>
              <div>
                <h3>Cada celebración tiene sus condiciones</h3>
                <p>
                  La ocasión, el lugar y la fecha ayudan a valorar la propuesta.
                  La consulta no confirma una reserva.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>
      <section className="container contact-close">
        <div className="callout">
          <div>
            <h2>¿Tienes una duda concreta?</h2>
            <p>Cuéntanos si es sobre un producto, un evento o una visita.</p>
          </div>
          <Button asChild>
            <Link href="/contacto/">Escribir a Piroboom</Link>
          </Button>
        </div>
      </section>
      {promo && <CampaignPromo title={promo.name} />}
    </div>
  );
}
