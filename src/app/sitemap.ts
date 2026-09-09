import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content";
import { publicIndexing, siteUrl } from "@/lib/seo";
import { navigation } from "@/lib/navigation";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const content = getContent();
  if (!publicIndexing() || content.isDemo) return [];
  const routes: string[] = navigation.map((item) => item.href);
  for (const family of content.families) {
    routes.push(`/catalogo-pdf/${family.slug}/`);
    for (const product of content.products.filter(
      (item) => item.familyId === family.id,
    ))
      routes.push(`/catalogo-pdf/${family.slug}/${product.slug}/`);
  }
  for (const [kind, path] of [
    ["notice", "aviso-legal"],
    ["privacy", "politica-de-privacidad"],
    ["cookies", "politica-de-cookies"],
  ] as const)
    if (content.legal[kind].status === "published") routes.push(`/${path}/`);
  return routes.map((route) => ({ url: `${siteUrl()}${route}` }));
}
