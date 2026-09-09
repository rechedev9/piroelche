import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getContent } from "@/lib/content";
import { getLeadAvailability } from "@/lib/lead-server";
import { pageMetadata } from "@/lib/seo";
import { LeadForm } from "@/components/lead-form";
import { Media, ProductVideo } from "@/components/media";

export const metadata = pageMetadata(
  "Eventos y celebraciones",
  "Consulta opciones para bodas, revelaciones, cumpleaños y fiestas. Solicita una valoración según la ocasión, fecha y lugar.",
  "/eventos/",
);
const steps = [
  [
    "Cuéntanos el evento",
    "Ocasión, fecha o «por definir», lugar y cómo responderte.",
  ],
  [
    "Valoramos la propuesta",
    "Se revisa qué puede encajar con el recinto y sus condiciones.",
  ],
  [
    "Recibes una oferta",
    "Con alcance, qué incluye y quién se ocupa de cada parte.",
  ],
  [
    "Confirmamos condiciones",
    "Fecha, disponibilidad, permisos si aplican y modalidad del servicio.",
  ],
];
export default async function Events({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { brand, solutions, occasions, cases, store } = getContent();
  const eventImage =
    brand?.eventHero || solutions.find((item) => item.image)?.image;
  const occasion =
    typeof params.ocasion === "string" &&
    occasions.some((item) => item.id === params.ocasion)
      ? params.ocasion
      : undefined;
  return (
    <>
      <section className="events-hero brand-events-hero dark">
        <div className="container brand-event-intro">
          <div>
            <p className="eyebrow brand-eyebrow">Eventos</p>
            <h1>Cuéntanos qué celebras. Nosotros te decimos qué encaja.</h1>
            <p className="lead">
              No hace falta que sepas qué producto necesitas. Con la fecha, el
              lugar y la ocasión podemos valorar la propuesta.
            </p>
            <Button asChild variant="yellow">
              <Link href="#solicitud">Solicitar propuesta</Link>
            </Button>
          </div>
          <figure className="brand-events-visual">
            <Media
              src={eventImage?.src}
              alt={eventImage?.alt || "Una celebración con luz y color"}
              ratio="4 / 5"
              fit="contain"
              dark
            />
            <figcaption>Una idea. Tu ocasión. Muchas posibilidades.</figcaption>
          </figure>
        </div>
      </section>
      <section className="container section brand-solutions">
        <h2 className="section-heading brand-section-heading">
          Qué puedes contratar
        </h2>
        <p className="section-intro">
          Cada solución explica qué resuelve, cómo se valora y qué necesitamos
          saber.
        </p>
        <div className="brand-solution-list">
          {solutions.map((solution, index) => (
            <article className="card solution" key={solution.id}>
              <Media
                src={solution.image?.src}
                alt={solution.image?.alt || solution.label}
                ratio="4 / 3"
                fit="contain"
              />
              <div className="card-body">
                <div>
                  <p className="eyebrow brand-solution-label">
                    <span aria-hidden="true">0{index + 1}</span>
                    {solution.label}
                  </p>
                  <h3>{solution.title}</h3>
                </div>
                <p>
                  <strong>Qué resuelve · </strong>
                  {solution.result}
                </p>
                <p>
                  <strong>Cómo lo ofrecemos · </strong>
                  {solution.delivery}
                </p>
                <p>
                  <strong>Qué necesitamos · </strong>
                  {solution.needs}
                </p>
                <Button asChild size="compact">
                  <Link
                    href={`/eventos/?ocasion=${solution.occasionId}#solicitud`}
                  >
                    Solicitar para{" "}
                    {solution.id === "boda"
                      ? "boda"
                      : solution.id === "revelacion"
                        ? "revelación"
                        : "celebración"}
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>
          También puedes consultar por comuniones y eventos corporativos en
          «Otra» o «Celebración mayor / fiesta». La modalidad y
          responsabilidades se concretan en la propuesta.
        </p>
      </section>
      <section className="container section brand-process">
        <h2 className="brand-section-heading">Cómo funciona</h2>
        <ol className="grid grid-4 process">
          {steps.map(([title, text], index) => (
            <li className="card" key={title}>
              <span className="step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
      {cases.length ? (
        <section className="container section">
          <h2>Trabajos realizados</h2>
          <div className="grid grid-3 cases">
            {cases.map((item) => (
              <figure className="card" key={item.id}>
                <Media
                  src={item.image?.src}
                  alt={item.image?.alt || item.title}
                  dark
                />
                <figcaption>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  {item.video && (
                    <ProductVideo
                      src={item.video.src}
                      poster={item.video.poster}
                      caption={item.video.caption}
                      captions={item.video.captions}
                    />
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : brand?.gallery.length ? (
        <section className="brand-gallery-section dark">
          <div className="container">
            <p className="eyebrow brand-eyebrow">Galería Piroboom</p>
            <h2>Luz y color, en imágenes</h2>
            <p className="brand-gallery-intro">
              Una selección de fotografías publicadas por Piroboom para explorar
              efectos y ambientes.
            </p>
            <div className="brand-gallery">
              {brand.gallery.map((photo) => (
                <figure key={photo.src}>
                  <Media
                    src={photo.src}
                    alt=""
                    ratio="4 / 5"
                    fit="contain"
                    dark
                  />
                  <figcaption>{photo.alt}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="container section">
          <h2>Trabajos realizados</h2>
          <div className="empty-state">
            <p>
              Las fotografías y los detalles de trabajos se incorporarán cuando
              estén disponibles y autorizados. Mientras tanto, puedes consultar
              qué opciones valorar para tu celebración.
            </p>
          </div>
        </section>
      )}
      <section className="container section section-last" id="solicitud">
        <div className="card grid grid-2 event-form-wrap brand-event-form">
          <div className="brand-form-copy dark">
            <p className="eyebrow brand-eyebrow">Dale forma a tu idea</p>
            <h2>Solicitar propuesta</h2>
            <p>
              Con estos datos se valora la propuesta. El resto se concreta
              contigo después; no necesitas saber de pirotecnia.
            </p>
            <ul>
              <li>La fecha y el recinto pueden estar por definir.</li>
              <li>Sin compromiso hasta confirmar las condiciones.</li>
              <li>La solicitud no confirma reserva ni viabilidad.</li>
            </ul>
          </div>
          <div className="brand-form-fields">
            <LeadForm
              key={occasion || "default-event"}
              variant="event"
              initialOccasion={occasion}
              occasions={occasions}
              availability={getLeadAvailability()}
              phone={store.phone}
              phoneDisplay={store.phoneDisplay}
            />
          </div>
        </div>
      </section>
    </>
  );
}
