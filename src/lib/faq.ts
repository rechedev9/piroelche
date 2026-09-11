import type { PublicContent } from "./content-schema";
import { formatSchedule } from "./hours";
import type { FaqItem } from "./seo";

const joinList = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
    : (items[0] ?? "");

/**
 * Answers are assembled from the same published data the pages already show
 * (store record, channels, families, campaigns, PDF); nothing is asserted that
 * the content file does not carry. Wording mirrors the site's own copy so the
 * FAQ never promises more than the pages do.
 */
export function buildFaq(content: PublicContent): FaqItem[] {
  const { store, channels, families, campaigns, pdf } = content;
  const schedule = formatSchedule(store.schedule)
    .map((row) => `${row.days}: ${row.hours.toLowerCase()}`)
    .join("; ");
  const contactWays = [
    `llamando al ${store.phoneDisplay}`,
    ...(store.landline ? [`al fijo ${store.landline.phoneDisplay}`] : []),
    ...(channels.whatsapp.enabled ? ["por WhatsApp al mismo móvil"] : []),
    ...(channels.email ? [`por correo a ${channels.email}`] : []),
    "con el formulario de esta página",
  ];
  // Town names only: some kiosk addresses are transcribed literally from the
  // source with pending verification (see their provenance notes).
  const kiosks = campaigns
    .filter((point) => point.status === "published")
    .map((point) => point.name);
  const items: FaqItem[] = [
    {
      question: "¿Dónde está la tienda de pirotecnia Piroboom en Elche?",
      answer: `${store.name} está en ${store.address}. En la página Tiendas tienes la ruta en Google Maps.`,
    },
    {
      question: "¿Qué horario tiene la tienda?",
      answer: `Horario habitual: ${schedule}. Antes de venir, consulta en la página Tiendas si hay alguna excepción publicada.`,
    },
    {
      question: "¿Cómo puedo contactar con Piroboom?",
      answer: `Puedes consultar ${joinList(contactWays)}. Elige si prefieres la respuesta por teléfono o por correo.`,
    },
    {
      question: "¿Qué tipo de artículos de pirotecnia vende Piroboom?",
      answer: `Las familias del catálogo son ${families.map((family) => family.name.toLowerCase()).join(", ")}. Cada referencia tiene su clasificación y sus condiciones de uso; consúltalas en la tienda antes de comprar.`,
    },
  ];
  if (pdf.status !== "unavailable")
    items.push({
      question: "¿Puedo ver el catálogo de pirotecnia online?",
      answer: `Sí. El catálogo${pdf.edition ? ` ${pdf.edition}` : ""} se puede leer online página a página en la sección Catálogo y también descargar en PDF. Aparecer en el catálogo no garantiza stock en tienda: consúltanos antes de venir.`,
    });
  items.push({
    question:
      "¿Hacéis pirotecnia para bodas, revelaciones de sexo, cumpleaños y fiestas?",
    answer:
      "Sí, atendemos consultas para bodas, revelaciones, cumpleaños y celebraciones mayores. No hace falta que sepas qué producto necesitas: con la ocasión, la fecha y el lugar valoramos la propuesta y te la enviamos con su alcance y condiciones. La solicitud no confirma reserva ni viabilidad.",
  });
  if (kiosks.length)
    items.push({
      question: "¿Tenéis puntos de venta fuera de la tienda de Elche?",
      answer: `En temporada Piroboom publica casetas en ${joinList(kiosks)}. Las fechas de cada campaña se confirman en la página Tiendas; fuera de campaña, la tienda de Elche es la alternativa.`,
    });
  return items;
}
