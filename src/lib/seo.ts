import type { Metadata } from "next";
import type { Store } from "./content-schema";

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
      siteName: "Piroboom",
      title,
      description,
      url: pathname,
      images: [
        {
          url: `${siteUrl()}/brand/logo.webp`,
          width: 1200,
          height: 630,
          alt: "Piroboom · Pirotecnia · Elche",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteUrl()}/brand/logo.webp`],
    },
    robots: { index: publicIndexing(), follow: publicIndexing() },
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export type BreadcrumbItem = { label: string; href?: string };

/** A trail entry only contributes an absolute `item` when its own path is known. */
export function breadcrumbListJsonLd(items: readonly BreadcrumbItem[]) {
  const origin = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
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

/**
 * Only data the page already publishes: the address string as it is stored, the
 * municipality declared by the store source and the habitual weekly schedule.
 * Days without published intervals assert nothing instead of claiming a closure.
 */
export function localBusinessJsonLd(store: Store) {
  const origin = siteUrl();
  const openingHoursSpecification = store.schedule.flatMap((row) =>
    row.intervals.map((interval) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: row.days.map((day) => schemaWeekdays[day]),
      opens: interval.opens,
      closes: interval.closes,
    })),
  );
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Piroboom",
    url: origin,
    telephone: store.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address,
      addressLocality: "Elche",
    },
    image: `${origin}/brand/logo.webp`,
    ...(openingHoursSpecification.length ? { openingHoursSpecification } : {}),
  };
}
