import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getContent } from "@/lib/content";
import { getLocationHours } from "@/lib/hours";
import { pageMetadata } from "@/lib/seo";
import { FamilyGrid, Hours } from "@/components/site-content";
import { Media } from "@/components/media";
import { TrackedLink } from "@/components/tracked-link";
import { CampaignPromo } from "@/components/campaign-promo";

export const metadata = pageMetadata(
  "Pirotecnia para tus celebraciones en Elche",
  "Explora las familias de pirotecnia, consulta opciones para tu evento y encuentra la tienda Piroboom en Elche.",
  "/",
);
export default function Home() {
  const { store, solutions, campaigns } = getContent();
  const today = getLocationHours(store);
  const promo =
    process.env.PIROBOOM_PROMO === "1" &&
    campaigns.find(
      (campaign) => getLocationHours(campaign).campaignStatus === "active",
    );
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <p className="eyebrow">Tienda física · Elche</p>
            <h1>Pirotecnia para tus celebraciones en Elche.</h1>
            <p className="lead">
              Explora el catálogo y consulta las opciones para tu evento. Te
              ayudamos a elegir según el producto, el lugar y las condiciones de
              uso.
            </p>
            <div className="flex-row">
              <Button asChild variant="yellow">
                <TrackedLink
                  href="/catalogo-pdf/"
                  event={{ name: "select_journey", journey: "product" }}
                >
                  Explorar catálogo
                </TrackedLink>
              </Button>
              <Button asChild variant="light-outline">
                <TrackedLink
                  href="/eventos/"
                  event={{ name: "select_journey", journey: "event" }}
                >
                  Planificar mi evento
                </TrackedLink>
              </Button>
            </div>
            <div className="today">
              <span>
                Tienda Elche ·{" "}
                {today.scheduleConfirmed
                  ? `hoy ${today.todayHours}`
                  : "consulta el horario antes de venir"}
              </span>
              <Link href="/tiendas/">Horarios y cómo llegar</Link>
            </div>
          </div>
          <Media alt="Celebraciones con Piroboom" dark />
        </div>
      </section>
      <section className="container section">
        <h2 className="section-heading">¿Por dónde empezamos?</h2>
        <p className="section-intro">
          Dos formas de explorar, según lo que ya tengas claro.
        </p>
        <div className="grid grid-2">
          <TrackedLink
            href="/catalogo-pdf/"
            className="card card-link journey"
            event={{ name: "select_journey", journey: "product" }}
          >
            <span className="eyebrow">Sé qué producto busco</span>
            <h3>Ver familias y fichas de producto</h3>
            <p className="muted">
              Fuegos artificiales, humo de color, fuego frío, tracas. Consulta
              cada referencia y dónde adquirirla.
            </p>
            <span className="text-link">Explorar catálogo →</span>
          </TrackedLink>
          <TrackedLink
            href="/eventos/"
            className="card card-link journey"
            event={{ name: "select_journey", journey: "event" }}
          >
            <span className="eyebrow">Sé qué quiero celebrar</span>
            <h3>Cuéntanos el evento y te proponemos</h3>
            <p className="muted">
              Bodas, revelaciones, cumpleaños, fiestas. Valoramos qué encaja con
              tu lugar y tu fecha.
            </p>
            <span className="text-link">Planificar mi evento →</span>
          </TrackedLink>
        </div>
      </section>
      <section className="container section">
        <div className="spread">
          <h2 className="section-heading">Familias de producto</h2>
          <Link className="text-link" href="/catalogo-pdf/">
            Ver todo el catálogo →
          </Link>
        </div>
        <FamilyGrid />
      </section>
      <section className="dark events-band">
        <div className="container">
          <div className="spread">
            <h2>Soluciones para eventos</h2>
            <Link className="text-link" href="/eventos/">
              Ver soluciones y casos →
            </Link>
          </div>
          <div className="grid grid-3">
            {solutions.map((solution) => (
              <Link
                key={solution.id}
                href={`/eventos/?ocasion=${solution.occasionId}#solicitud`}
                className="card card-link solution-compact"
              >
                <span className="eyebrow">{solution.label}</span>
                <h3>{solution.title}</h3>
                <p>{solution.result}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container section grid grid-2 store-trust">
        <div className="card card-pad">
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
        <div className="trust">
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
    </>
  );
}
