import { getContent, getProductByRef } from "@/lib/content";
import { getLeadAvailability } from "@/lib/lead-server";
import type { LeadIntention } from "@/lib/lead-contract";
import { pageMetadata } from "@/lib/seo";
import { LeadForm } from "@/components/lead-form";
import { StoreContactCard } from "@/components/site-content";

export const metadata = pageMetadata(
  "Contacto",
  "Consulta por un artículo, un evento o una visita a Piroboom Elche. Elige correo o teléfono para la respuesta.",
  "/contacto/",
);
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { occasions, store } = getContent();
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
    <div className="container page-section grid grid-2 contact-page">
      <div>
        <p className="eyebrow">Contacto</p>
        <h1>Cuéntanos qué necesitas</h1>
        <p className="intro" style={{ marginBottom: 28 }}>
          Elige el motivo y te pedimos solo lo imprescindible. Puedes indicar un
          teléfono o un correo para la respuesta.
        </p>
        <StoreContactCard />
      </div>
      <div className="card form-card">
        <LeadForm
          key={`${initialIntention || "default"}:${requestedRef || ""}:${occasion || ""}`}
          variant="contact"
          initialIntention={initialIntention}
          initialOccasion={occasion}
          product={record ? { ref: record.ref, name: record.name } : undefined}
          invalidReference={Boolean(requestedRef && !record)}
          occasions={occasions}
          availability={getLeadAvailability()}
          phone={store.phone}
          phoneDisplay={store.phoneDisplay}
        />
      </div>
    </div>
  );
}
