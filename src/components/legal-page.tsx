import { getContent } from "@/lib/content";
export function LegalPage({
  kind,
}: {
  kind: "notice" | "privacy" | "cookies";
}) {
  const page = getContent().legal[kind];
  return (
    <article className="container page-section legal-page">
      <p className="eyebrow">Información legal</p>
      <h1>{page.title}</h1>
      {page.status !== "published" && (
        <p className="availability-notice">
          Información de esta versión en preparación. Pendiente de confirmación
          del titular y revisión jurídica antes de publicar.
        </p>
      )}
      <p className="muted small">
        Actualización de este texto: {page.updatedAt}
      </p>
      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
