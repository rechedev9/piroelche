import Link from "next/link";
import { getContent } from "@/lib/content";
import { formatSchedule, getLocationHours } from "@/lib/hours";
import { pageMetadata } from "@/lib/seo";
import { Media } from "@/components/media";
import { Hours, StoreActions } from "@/components/site-content";
import { TrackedLink } from "@/components/tracked-link";

export const metadata = pageMetadata(
  "Tiendas y horarios",
  "Dirección, horario habitual, teléfono y ruta a Piroboom Elche. Consulta la vigencia de las casetas de temporada.",
  "/tiendas/",
);
export default function Shops() {
  const { store, campaigns, isDemo } = getContent();
  const today = getLocationHours(store);
  return (
    <div className="container page-section">
      <p className="eyebrow">Tiendas</p>
      <h1>Dónde comprar</h1>
      <p className="intro">
        Consulta los artículos online y acude al punto de venta. Comprueba el
        horario y pregunta por la disponibilidad antes de venir.
      </p>
      <section className="card grid grid-2 store-card">
        <Media
          src={store.image?.src}
          alt={store.image?.alt || "Acceso a la tienda Piroboom Elche"}
        />
        <div className="card-body">
          <span className="badge yellow">Tienda permanente</span>
          <h2>{store.name}</h2>
          <address>{store.address}</address>
          <Hours store={store} />
          <p className="muted small" style={{ marginTop: 12 }}>
            {today.scheduleConfirmed
              ? today.label
              : "Horario habitual publicado; festivos y excepciones pendientes de confirmación."}
            {today.exceptionReason && ` ${today.exceptionReason}`}
          </p>
          <StoreActions store={store} />
        </div>
      </section>
      <section className="campaigns" id="casetas">
        <div className="spread">
          <h2>Casetas de temporada</h2>
          <span className="badge">
            {campaigns.length
              ? "Consulta cada punto"
              : "Sin campaña confirmada"}
          </span>
        </div>
        <p className="muted">
          Ubicaciones y horarios publicados por Piroboom. Confirma las fechas de
          campaña antes de acudir; la tienda permanente de Elche es la
          alternativa fuera de campaña.
        </p>
        {campaigns.length ? (
          <div className="grid grid-4">
            {campaigns.map((campaign) => {
              const state = getLocationHours(campaign);
              return (
                <article className="card campaign-card" key={campaign.id}>
                  <span
                    className={`badge ${state.status === "open" ? "success" : state.status === "upcoming" ? "yellow" : ""}`}
                  >
                    {state.label}
                  </span>
                  <h3>{campaign.name}</h3>
                  <p className="muted">{campaign.address}</p>
                  <dl>
                    <dt className="muted">Periodo</dt>
                    <dd>
                      {campaign.campaign.confirmed &&
                      campaign.campaign.startsOn &&
                      campaign.campaign.endsOn
                        ? `${campaign.campaign.startsOn} – ${campaign.campaign.endsOn}`
                        : "Fechas por confirmar"}
                    </dd>
                    <dt className="muted">Horario publicado</dt>
                    <dd>
                      {formatSchedule(campaign.schedule).map((row) => (
                        <div key={row.days}>
                          {row.days}: {row.hours}
                        </div>
                      ))}
                    </dd>
                  </dl>
                  {state.campaignStatus === "active" &&
                    state.status !== "open" && (
                      <p className="small">
                        Campaña activa no significa abierta en este momento.
                      </p>
                    )}
                  {!isDemo && campaign.directionsUrl && (
                    <Link
                      className="text-link"
                      href={campaign.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir ruta ↗
                    </Link>
                  )}
                  {campaign.provenance.kind !== "prototype-fixture" && (
                    <TrackedLink
                      className="text-link"
                      href={`tel:${store.phone}`}
                      event={{ name: "click_call" }}
                    >
                      Consultar fechas de {campaign.name} →
                    </TrackedLink>
                  )}
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
    </div>
  );
}
