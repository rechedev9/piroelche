import { JsonLd } from "@/components/json-ld";
import { faqPageJsonLd, type FaqItem } from "@/lib/seo";

/** Native disclosure widgets: readable without JS, crawlable in SSR HTML. */
export function Faq({
  items,
  structuredData = false,
}: {
  items: FaqItem[];
  structuredData?: boolean;
}) {
  return (
    <section className="container faq" aria-labelledby="faq-title">
      <div className="faq-heading">
        <p className="eyebrow brand-eyebrow">Preguntas frecuentes</p>
        <h2 id="faq-title">Lo que más nos preguntan</h2>
      </div>
      <div className="faq-list">
        {items.map((item) => (
          <details className="faq-item" key={item.question}>
            <summary>
              <h3>{item.question}</h3>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      {structuredData && <JsonLd data={faqPageJsonLd(items)} />}
    </section>
  );
}
