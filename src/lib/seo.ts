import type { Metadata } from "next";

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
          width: 552,
          height: 184,
          alt: "Piroboom · Pirotecnia · Elche",
        },
      ],
    },
    twitter: {
      card: "summary",
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
