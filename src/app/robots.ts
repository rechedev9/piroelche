import type { MetadataRoute } from "next";
import { publicIndexing, siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return publicIndexing()
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/media-demo/"],
        },
        sitemap: `${siteUrl()}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
