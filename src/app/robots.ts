import type { MetadataRoute } from "next";
import { publicIndexing, siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";

const privatePaths = ["/api/", "/media-demo/"];

/**
 * AI crawlers listed explicitly so the policy is visible and auditable; the
 * owner chose to allow both search-style and training-style agents.
 */
const aiAgents = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  if (!publicIndexing()) return { rules: { userAgent: "*", disallow: "/" } };
  const origin = siteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: aiAgents, allow: "/", disallow: privatePaths },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
