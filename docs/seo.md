# SEO and GEO

Everything below is derived from `content/site.json` and the constants in
`src/lib/seo.ts`; nothing is asserted that the pages do not already publish.

## Indexing gate

`publicIndexing()` (`src/lib/seo.ts`) is true only with `PIROBOOM_PUBLIC_SITE=1`,
outside the demo and outside Vercel previews. While it is false the site sends
`noindex, nofollow` (meta and `X-Robots-Tag`), `robots.txt` disallows everything,
`sitemap.xml` is empty and `llms.txt` returns 404. Publishing also requires the
three legal texts to be `published` (`pnpm validate:content`).

`PIROBOOM_GOOGLE_SITE_VERIFICATION` emits the Search Console meta tag when set.

## Per page

`pageMetadata(title, description, pathname)` sets title, description, canonical,
Open Graph and Twitter (`summary_large_image`). The root segment does not receive
the layout title template, so the home title carries the brand itself. The old
WordPress site used the same six URLs; the only legacy redirect is the uploaded
catalogue PDF (`next.config.ts`).

## Shared Open Graph image

`src/app/opengraph-image.png` (1200x630) is a static metadata file served at
`/opengraph-image.png`. `pageMetadata` lists it explicitly in `openGraph.images`
(with its alt text), because a page that exports its own `openGraph` replaces
the parent's wholesale and would otherwise lose the card; Twitter inherits it.
Regenerate it with `pnpm brand:og`
(`scripts/prepare-og-image.tsx`, satori via `next/og`) after changing the logo,
the store address or its copy. A static file avoids runtime font loading and
the trailing-slash redirect that `trailingSlash: true` adds to generated image
routes.

## Structured data (JSON-LD)

| Block                                    | Where                      | Source                                       |
| ---------------------------------------- | -------------------------- | -------------------------------------------- |
| `Organization`, `WebSite`, `Store` graph | Root layout (not in demo)  | `store`, `channels`, `families`, `campaigns` |
| `BreadcrumbList`                         | Catalogue, family, product | Visible trail plus an implicit home entry    |
| `FAQPage`                                | `/contacto/`               | `buildFaq()` in `src/lib/faq.ts`             |
| `Product` (+ `Offer` if priced)          | Product page               | Published product record                     |

`store.postalAddress` splits the displayed address; `store.geo` comes from the
store's own Google Maps listing (`directionsUrl`) and is used only here. Kiosk
answers in the FAQ and `llms.txt` list town names only because some kiosk
addresses are literal transcriptions pending verification.

## GEO (AI assistants)

- `robots.txt` names the main AI crawlers explicitly with the same allow rules
  as everyone else (owner decision: allow both search and training agents).
- `/llms.txt` (`src/app/llms.txt/route.ts`) is a Markdown summary: store data,
  hours, kiosks, catalogue families with URLs, page list, FAQ and social links.
- The FAQ section on `/contacto/` is rendered server-side with `<details>`, so
  the same answers are readable without JavaScript.

## Checks

`tests/e2e/publication.spec.ts` covers canonical, `og:url`, robots, sitemap and
the no-third-party rule; `quality.spec.ts` runs axe on the FAQ page. To review
public-mode output locally, build once and start with `PIROBOOM_PUBLIC_SITE=1`
(headers are fixed at build time, the rest is evaluated per request).
