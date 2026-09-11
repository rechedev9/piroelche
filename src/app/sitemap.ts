import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content";
import { publicIndexing, siteUrl } from "@/lib/seo";
import { navigation } from "@/lib/navigation";
export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];
type Frequency = NonNullable<Entry["changeFrequency"]>;

const navigationProfile: Record<
  (typeof navigation)[number]["href"],
  { priority: number; changeFrequency: Frequency }
> = {
  "/": { priority: 1, changeFrequency: "weekly" },
  "/catalogo-pdf/": { priority: 0.9, changeFrequency: "weekly" },
  "/eventos/": { priority: 0.8, changeFrequency: "monthly" },
  "/tiendas/": { priority: 0.8, changeFrequency: "weekly" },
  "/contacto/": { priority: 0.7, changeFrequency: "monthly" },
  "/sobre-nosotros/": { priority: 0.5, changeFrequency: "yearly" },
};

const latest = (...dates: (string | undefined)[]) => {
  const known = dates
    .filter((date): date is string => Boolean(date))
    .toSorted();
  return known.length ? new Date(known[known.length - 1]) : undefined;
};

export default function sitemap(): MetadataRoute.Sitemap {
  const content = getContent();
  if (!publicIndexing() || content.isDemo) return [];
  const origin = siteUrl();
  const entry = (path: string, rest: Omit<Entry, "url">): Entry => ({
    url: `${origin}${path}`,
    ...rest,
  });
  const storeUpdated = latest(
    content.store.provenance.checkedAt,
    ...content.campaigns.map((point) => point.provenance.checkedAt),
  );
  const catalogueUpdated = latest(
    content.pdf.provenance.checkedAt,
    ...content.products.map((product) => product.provenance.checkedAt),
  );
  const lastModifiedByPath: Partial<Record<string, Date | undefined>> = {
    "/": latest(storeUpdated?.toISOString(), catalogueUpdated?.toISOString()),
    "/catalogo-pdf/": catalogueUpdated,
    "/tiendas/": storeUpdated,
  };
  const entries = navigation.map((item) =>
    entry(item.href, {
      ...navigationProfile[item.href],
      lastModified: lastModifiedByPath[item.href],
    }),
  );
  for (const family of content.families) {
    entries.push(
      entry(`/catalogo-pdf/${family.slug}/`, {
        priority: 0.7,
        changeFrequency: "monthly",
        lastModified: catalogueUpdated,
      }),
    );
    for (const product of content.products.filter(
      (item) => item.familyId === family.id,
    ))
      entries.push(
        entry(`/catalogo-pdf/${family.slug}/${product.slug}/`, {
          priority: 0.6,
          changeFrequency: "monthly",
          lastModified: latest(product.provenance.checkedAt),
        }),
      );
  }
  for (const [kind, path] of [
    ["notice", "aviso-legal"],
    ["privacy", "politica-de-privacidad"],
    ["cookies", "politica-de-cookies"],
  ] as const)
    if (content.legal[kind].status === "published")
      entries.push(
        entry(`/${path}/`, {
          priority: 0.2,
          changeFrequency: "yearly",
          lastModified: new Date(content.legal[kind].updatedAt),
        }),
      );
  return entries;
}
