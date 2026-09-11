import type { Metadata } from "next";
import type {
  Campaign,
  Channels,
  Family,
  Product,
  Store,
} from "./content-schema";

export const SITE_NAME = "Piroboom";
export const SITE_TITLE = "Piroboom · Pirotecnia en Elche";
export const SITE_DESCRIPTION =
  "Tienda de pirotecnia en Elche (Alicante): fuegos artificiales, humo de color, fuego frío y tracas. Catálogo 2026 y consultas para bodas, revelaciones y fiestas.";

export function siteUrl() {
  const configured =
    process.env.PIROBOOM_SITE_URL || "https://pirotecniaelche.es";
  const url = new URL(configured);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("PIROBOOM_SITE_URL debe ser HTTP(S).");
  return url.origin;
}
export function publicIndexing() {
  return (
    process.env.PIROBOOM_PUBLIC_SITE === "1" &&
    process.env.PIROBOOM_DEMO !== "1" &&
    process.env.VERCEL_ENV !== "preview"
  );
}
/** Search Console token; only emitted when set so previews never claim the property. */
export function googleSiteVerification() {
  return process.env.PIROBOOM_GOOGLE_SITE_VERIFICATION?.trim() || undefined;
}
/**
 * Per-page metadata. Open Graph and Twitter images come from the root
 * `opengraph-image` file convention, which Next applies to every route.
 */
export function pageMetadata(
  title: string,
  description: string,
  pathname: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: pathname },
    openGraph: {
      type: "website",
      locale: "es_ES",
      siteName: SITE_NAME,
      title,
      description,
      url: pathname,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: publicIndexing(), follow: publicIndexing() },
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export type BreadcrumbItem = { label: string; href?: string };

/**
 * The visible trail omits the home link; the structured trail always starts at
 * it so the list has at least two positions. An entry only contributes an
 * absolute `item` when its own path is known.
 */
export function breadcrumbListJsonLd(items: readonly BreadcrumbItem[]) {
  const origin = siteUrl();
  const trail: BreadcrumbItem[] = [{ label: "Inicio", href: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${origin}${item.href}` } : {}),
    })),
  };
}

// Schema.org day names indexed like Date#getDay and the content schedule (0 = Sunday).
const schemaWeekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const ids = (origin: string) => ({
  organization: `${origin}/#organization`,
  website: `${origin}/#website`,
  store: `${origin}/#store`,
  logo: `${origin}/#logo`,
});

function openingHours(store: Store) {
  return store.schedule.flatMap((row) =>
    row.intervals.map((interval) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: row.days.map((day) => schemaWeekdays[day]),
      opens: interval.opens,
      closes: interval.closes,
    })),
  );
}

function postalAddress(store: Store) {
  return store.postalAddress
    ? { "@type": "PostalAddress", ...store.postalAddress }
    : {
        "@type": "PostalAddress",
        streetAddress: store.address,
        addressLocality: "Elche",
      };
}

function sameAs(channels: Channels) {
  return [channels.social.facebook?.url, channels.social.instagram?.url].filter(
    (url): url is string => Boolean(url),
  );
}

/**
 * Site-wide graph: the Organization (brand), its WebSite and the physical
 * Store. Only data already published on the site or derived from the store's
 * own Maps listing (geo); days without intervals assert nothing.
 */
export function siteGraphJsonLd({
  store,
  channels,
  families,
  campaigns,
}: {
  store: Store;
  channels: Channels;
  families: readonly Family[];
  campaigns: readonly Campaign[];
}) {
  const origin = siteUrl();
  const id = ids(origin);
  const logo = {
    "@type": "ImageObject",
    "@id": id.logo,
    url: `${origin}/brand/logo.webp`,
    contentUrl: `${origin}/brand/logo.webp`,
    width: 552,
    height: 184,
    caption: SITE_NAME,
  };
  const social = sameAs(channels);
  const telephone = [store.phone, store.landline?.phone].filter(Boolean);
  const hours = openingHours(store);
  const areaServed = [
    store.postalAddress?.addressLocality ?? "Elche",
    ...campaigns
      .filter((point) => point.status === "published")
      .map((point) => point.name),
  ].filter((name, index, all) => all.indexOf(name) === index);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": id.organization,
        name: SITE_NAME,
        legalName: store.name,
        url: `${origin}/`,
        logo,
        image: { "@id": id.logo },
        telephone: store.phone,
        ...(channels.email ? { email: channels.email } : {}),
        ...(social.length ? { sameAs: social } : {}),
        address: postalAddress(store),
      },
      {
        "@type": "WebSite",
        "@id": id.website,
        url: `${origin}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "es-ES",
        publisher: { "@id": id.organization },
      },
      {
        "@type": "Store",
        "@id": id.store,
        name: store.name,
        alternateName: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: `${origin}/tiendas/`,
        image: `${origin}${store.image?.src ?? "/brand/logo.webp"}`,
        logo: { "@id": id.logo },
        telephone,
        ...(channels.email ? { email: channels.email } : {}),
        address: postalAddress(store),
        ...(store.geo
          ? { geo: { "@type": "GeoCoordinates", ...store.geo } }
          : {}),
        hasMap: store.directionsUrl,
        ...(hours.length ? { openingHoursSpecification: hours } : {}),
        areaServed: areaServed.map((name) => ({ "@type": "City", name })),
        currenciesAccepted: "EUR",
        parentOrganization: { "@id": id.organization },
        ...(social.length ? { sameAs: social } : {}),
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Catálogo de pirotecnia",
          url: `${origin}/catalogo-pdf/`,
          itemListElement: families.map((family) => ({
            "@type": "OfferCatalog",
            name: family.name,
            description: family.description,
            url: `${origin}/catalogo-pdf/${family.slug}/`,
          })),
        },
      },
    ],
  };
}

export type FaqItem = { question: string; answer: string };

export function faqPageJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

const schemaAvailability = {
  "in-stock": "https://schema.org/InStock",
  "out-of-stock": "https://schema.org/OutOfStock",
  unknown: "https://schema.org/LimitedAvailability",
} as const;

/** Only published data; a missing price yields no Offer instead of a fake one. */
export function productJsonLd(
  product: Product,
  family: Family,
  pathname: string,
) {
  const origin = siteUrl();
  const id = ids(origin);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.ref,
    category: family.name,
    url: `${origin}${pathname}`,
    ...(product.image ? { image: `${origin}${product.image.src}` } : {}),
    brand: { "@id": id.organization },
    ...(product.price != null
      ? {
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "EUR",
            availability: schemaAvailability[product.availability],
            url: `${origin}${pathname}`,
            seller: { "@id": id.store },
          },
        }
      : {}),
  };
}
