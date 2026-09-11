import { serializeJsonLd } from "@/lib/seo";

/** Inline schema.org block; callers decide whether the data may be published. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
