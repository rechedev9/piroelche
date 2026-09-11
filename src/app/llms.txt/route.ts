import { getContent } from "@/lib/content";
import { catalogue } from "@/lib/catalogue";
import { buildFaq } from "@/lib/faq";
import { formatSchedule } from "@/lib/hours";
import {
  publicIndexing,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteUrl,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * llms.txt (https://llmstxt.org): a plain-Markdown summary for AI assistants,
 * built from the same published content as the pages. Withheld while the site
 * is not public so previews and the demo never get summarised as real data.
 */
export function GET() {
  const content = getContent();
  if (!publicIndexing() || content.isDemo)
    return new Response("Not found", { status: 404 });
  const origin = siteUrl();
  const { store, channels, families, campaigns, pdf } = content;
  const schedule = formatSchedule(store.schedule).map(
    (row) => `- ${row.days}: ${row.hours}`,
  );
  // Town names only: some kiosk addresses are literal transcriptions pending
  // verification (see their provenance notes in content/site.json).
  const kiosks = campaigns
    .filter((point) => point.status === "published")
    .map((point) => `- ${point.name} (fechas por confirmar)`);
  const social = [
    channels.social.facebook && `- Facebook: ${channels.social.facebook.url}`,
    channels.social.instagram &&
      `- Instagram: ${channels.social.instagram.url}`,
  ].filter(Boolean);
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    `${store.name} es una tienda física de pirotecnia en Elche (Alicante, España). Vende artículos de pirotecnia y atiende consultas para celebraciones (bodas, revelaciones de sexo, cumpleaños y fiestas). No vende online: las consultas se responden por teléfono o correo y la compra se hace en la tienda o en las casetas de temporada.`,
    "",
    "## Tienda",
    "",
    `- Dirección: ${store.address}`,
    `- Cómo llegar: ${store.directionsUrl}`,
    `- Teléfono móvil: ${store.phoneDisplay} (${store.phone})`,
    ...(store.landline
      ? [
          `- Teléfono fijo: ${store.landline.phoneDisplay} (${store.landline.phone})`,
        ]
      : []),
    ...(channels.whatsapp.enabled && channels.whatsapp.url
      ? [`- WhatsApp: ${channels.whatsapp.url}`]
      : []),
    ...(channels.email ? [`- Correo: ${channels.email}`] : []),
    "",
    "### Horario habitual",
    "",
    ...schedule,
    "",
    `Las excepciones y festivos se publican en ${origin}/tiendas/.`,
    "",
    ...(kiosks.length ? ["### Casetas de temporada", "", ...kiosks, ""] : []),
    "## Catálogo",
    "",
    `- Catálogo online (edición ${catalogue.edition}, ${catalogue.pages.length} páginas): ${origin}/catalogo-pdf/`,
    ...(pdf.status !== "unavailable" && pdf.url
      ? [
          `- Catálogo en PDF: ${pdf.url.startsWith("/") ? origin + pdf.url : pdf.url}`,
        ]
      : []),
    "",
    "### Familias de artículos",
    "",
    ...families.map(
      (family) =>
        `- [${family.name}](${origin}/catalogo-pdf/${family.slug}/): ${family.description}`,
    ),
    "",
    "Aparecer en el catálogo no garantiza stock en tienda; cada referencia tiene su clasificación y condiciones de uso.",
    "",
    "## Páginas",
    "",
    `- [Inicio](${origin}/)`,
    `- [Sobre nosotros](${origin}/sobre-nosotros/)`,
    `- [Eventos y celebraciones](${origin}/eventos/): consultas para bodas, revelaciones, cumpleaños y fiestas`,
    `- [Tiendas y horarios](${origin}/tiendas/)`,
    `- [Catálogo](${origin}/catalogo-pdf/)`,
    `- [Contacto](${origin}/contacto/)`,
    "",
    "## Preguntas frecuentes",
    "",
    ...buildFaq(content).flatMap((item) => [
      `### ${item.question}`,
      "",
      item.answer,
      "",
    ]),
    ...(social.length ? ["## Redes sociales", "", ...social, ""] : []),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
