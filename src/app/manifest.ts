import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "es",
    start_url: "/",
    display: "browser",
    background_color: "#fbf9f4",
    theme_color: "#0d0d10",
    icons: [
      { src: "/brand/icon-v2-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-v2-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/apple-icon-v2.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
