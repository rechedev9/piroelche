import { getContent, getProductByRef } from "@/lib/content";
import { getLeadAvailability } from "@/lib/lead-server";
import type { LeadIntention } from "@/lib/lead-contract";
import { buildFaq } from "@/lib/faq";
import { pageMetadata } from "@/lib/seo";
import { Faq } from "@/components/faq";
import { LeadForm } from "@/components/lead-form";
import { StoreContactCard } from "@/components/site-content";
import { Media } from "@/components/media";

export const metadata = pageMetadata(
  "Contacto y preguntas frecuentes",
  "Consulta a Piroboom Elche por un artículo, un evento o una visita: formulario, teléfono, WhatsApp y respuestas a las dudas más habituales.",
  "/contacto/",
);
export default async function Contact({
  searchParams,
}: PageProps<"/contacto">) {
  const params = await searchParams;
  const content = getContent();
  const { brand, occasions, store, isDemo } = content;
  const welcomeImage = brand?.storeWelcome || store.image;
  const intentions: Record<string, LeadIntention> = {
    producto: "product",
    evento: "event",
    visita: "visit",
  };
  const initialIntention =
    typeof params.motivo === "string" ? intentions[params.motivo] : undefined;
  const requestedRef =
    initialIntention === "product" && typeof params.ref === "string"
      ? params.ref
      : undefined;
  const record = requestedRef ? getProductByRef(requestedRef) : undefined;
  const occasion =
    initialIntention === "event" &&
    typeof params.ocasion === "string" &&
    occasions.some((item) => item.id === params.ocasion)
      ? params.ocasion
      : undefined;
  return (
    <>
      <div className="container page-section grid grid-2 contact-page brand-contact">
        <div className="brand-contact-intro">
          <p className="eyebrow brand-eyebrow">Contacto</p>
          <h1>Cuéntanos qué necesitas</h1>
          <p className="intro" style={{ marginBottom: 28 }}>
            Elige el motivo y te pedimos solo lo imprescindible. Puedes indicar
            un teléfono o un correo para la respuesta.
          </p>
          <StoreContactCard />
          <figure className="brand-contact-photo">
            <Media
              src={welcomeImage?.src}
              alt={welcomeImage?.alt || "La tienda Piroboom en Elche"}
              ratio="21 / 9"
              fit={welcomeImage?.fit}
            />
            <figcaption>También puedes venir a la tienda de Elche.</figcaption>
          </figure>
        </div>
        <div className="card form-card">
          <LeadForm
            key={`${initialIntention || "default"}:${requestedRef || ""}:${occasion || ""}`}
            variant="contact"
            initialIntention={initialIntention}
            initialOccasion={occasion}
            product={
              record ? { ref: record.ref, name: record.name } : undefined
            }
            invalidReference={Boolean(requestedRef && !record)}
            occasions={occasions}
            availability={getLeadAvailability()}
            phone={store.phone}
            phoneDisplay={store.phoneDisplay}
          />
        </div>
      </div>
      <Faq items={buildFaq(content)} structuredData={!isDemo} />
    </>
  );
}
