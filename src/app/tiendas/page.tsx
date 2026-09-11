import Link from "next/link";
import { getContent } from "@/lib/content";
import { formatSchedule, getLocationHours } from "@/lib/hours";
import { pageMetadata } from "@/lib/seo";
import { Media } from "@/components/media";
import { Hours, StoreActions } from "@/components/site-content";
import { TrackedLink } from "@/components/tracked-link";
import { Button } from "@/components/ui/button";

export const metadata = pageMetadata(
  "Tienda de pirotecnia en Elche: dirección y horario",
  "Piroboom en Calle Gloria Fuertes, s/n, Elche: horario, teléfono y cómo llegar. Casetas de temporada en Elche, Alicante, Santa Pola y La Zenia.",
  "/tiendas/",
);

function LocationIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function Shops() {
  const { brand, store, campaigns, isDemo } = getContent();
  const welcomeImage = brand?.storeWelcome || store.image;
  const boothImage = brand?.campaignBooth;
  const today = getLocationHours(store);
  return (
    <div className="brand-shops">
      <header className="shops-hero dark">
        <div className="container shops-hero-inner">
          <div>
            <p className="eyebrow brand-eyebrow">Tiendas</p>
            <h1>
              Dónde <span>comprar</span>
            </h1>
          </div>
          <div className="shops-hero-copy">
            <p className="intro">
              Consulta los artículos online y acude al punto de venta. Comprueba
              el horario y pregunta por la disponibilidad antes de venir.
            </p>
            <nav className="shops-section-links" aria-label="Tiendas">
              <Link href="#tienda">
                Tienda principal <span aria-hidden="true">↓</span>
              </Link>
              <Link href="#casetas">
                Casetas de temporada <span aria-hidden="true">↓</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container shops-content">
        <section
          className="card brand-store-card"
          id="tienda"
          aria-labelledby="store-heading"
        >
          <figure className="shops-store-photo">
            <Media
              src={store.image?.src || welcomeImage?.src}
              alt={store.image?.alt || welcomeImage?.alt || store.name}
              fit={store.image?.fit || welcomeImage?.fit}
              priority
            />
            <figcaption>
              <span>{store.name}</span>
              Ven a la tienda
            </figcaption>
          </figure>
          <div className="shops-store-info">
            <span className="badge">Tienda principal</span>
            <h2 id="store-heading">{store.name}</h2>
            <address>
              <LocationIcon />
              <span>{store.address}</span>
            </address>
            <div className="shops-hours">
              <h3>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Horario publicado
              </h3>
              <Hours store={store} />
            </div>
            <p className="shops-hours-note">
              {today.scheduleConfirmed
                ? today.label
                : "Horario habitual publicado; festivos y excepciones pendientes de confirmación."}
              {today.exceptionReason && ` ${today.exceptionReason}`}
            </p>
            <StoreActions store={store} compact={false} />
          </div>
        </section>

        <section
          className="campaigns shops-campaigns"
          id="casetas"
          aria-labelledby="campaigns-heading"
        >
          <div className="spread">
            <h2 id="campaigns-heading" className="brand-section-heading">
              Casetas de temporada
            </h2>
            <span className="badge">
              {campaigns.length
                ? "Consulta cada punto"
                : "Sin campaña confirmada"}
            </span>
          </div>
          <p className="muted">
            Ubicaciones y horarios publicados por Piroboom. Confirma las fechas
            de campaña antes de acudir; la tienda principal de Elche es la
            alternativa fuera de campaña.
          </p>
          {boothImage && (
            <figure className="shops-campaign-photo">
              <Media
                src={boothImage.src}
                alt={boothImage.alt}
                fit={boothImage.fit}
                ratio="5 / 2"
              />
              <figcaption>
                Caseta de temporada de Piroboom. Imagen de ejemplo: cada punto
                de venta tiene su propia caseta.
              </figcaption>
            </figure>
          )}
          {campaigns.length ? (
            <div className="shops-campaign-grid">
              {campaigns.map((campaign) => {
                const state = getLocationHours(campaign);
                return (
                  <article className="card campaign-card" key={campaign.id}>
                    <div className="shops-campaign-heading">
                      <span className="shops-location-icon">
                        <LocationIcon />
                      </span>
                      <div>
                        <h3>{campaign.name}</h3>
                        <p className="muted">{campaign.address}</p>
                      </div>
                    </div>
                    <span
                      className={`badge ${state.status === "open" ? "success" : state.status === "upcoming" ? "yellow" : ""}`}
                    >
                      {state.label}
                    </span>
                    <dl>
                      <div>
                        <dt>Periodo</dt>
                        <dd>
                          {campaign.campaign.confirmed &&
                          campaign.campaign.startsOn &&
                          campaign.campaign.endsOn
                            ? `${campaign.campaign.startsOn} – ${campaign.campaign.endsOn}`
                            : "Fechas por confirmar"}
                        </dd>
                      </div>
                      <div>
                        <dt>Horario publicado</dt>
                        <dd>
                          {formatSchedule(campaign.schedule).map((row) => (
                            <div
                              key={row.days}
                              className="shops-campaign-hours"
                            >
                              <span>{row.days}</span>
                              {row.hours}
                            </div>
                          ))}
                        </dd>
                      </div>
                    </dl>
                    {state.campaignStatus === "active" &&
                      state.status !== "open" && (
                        <p className="small">
                          Campaña activa no significa abierta en este momento.
                        </p>
                      )}
                    <div className="shops-campaign-actions">
                      {!isDemo && campaign.directionsUrl && (
                        <Link
                          className="text-link"
                          href={campaign.directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir ruta <span aria-hidden="true">↗</span>
                        </Link>
                      )}
                      {campaign.provenance.kind !== "prototype-fixture" && (
                        <TrackedLink
                          className="text-link"
                          href={`tel:${store.phone}`}
                          event={{ name: "click_call" }}
                        >
                          <span>
                            Consultar fechas
                            <span className="screen-reader-only">
                              {" "}
                              de {campaign.name}
                            </span>
                          </span>
                          <span aria-hidden="true">→</span>
                        </TrackedLink>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>
                No hay ubicaciones temporales con fechas confirmadas para
                publicar. Consulta la tienda de Elche para planificar tu visita.
              </p>
              <Link className="text-link" href="/contacto/?motivo=visita">
                Consultar una visita →
              </Link>
            </div>
          )}
        </section>

        <section
          className="brand-store-detail dark"
          aria-labelledby="visit-heading"
        >
          <Media
            src={welcomeImage?.src}
            alt={welcomeImage?.alt || "La tienda Piroboom en Elche"}
            fit={welcomeImage?.fit}
          />
          <div className="shops-visit-copy">
            <p className="eyebrow brand-eyebrow">Ven a la tienda</p>
            <h2 id="visit-heading">Consulta antes de elegir</h2>
            <p>
              Puedes venir con una referencia o contarnos qué quieres celebrar.
              Pregunta por el artículo, sus condiciones y la disponibilidad
              antes de desplazarte.
            </p>
            <Button asChild variant="yellow">
              <Link href="/contacto/?motivo=producto">
                Consultar por un artículo <span aria-hidden="true">→</span>
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
