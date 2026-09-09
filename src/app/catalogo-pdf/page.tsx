import { Breadcrumbs } from "@/components/breadcrumbs";
import { FamilyGrid, PdfAction } from "@/components/site-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Catálogo de pirotecnia",
  "Fuegos artificiales, humo de color, fuego frío, tracas y otros artículos. Consulta familias y el catálogo PDF de Piroboom.",
  "/catalogo-pdf/",
);
export default function Catalogue() {
  return (
    <div className="container page-section catalog-page">
      <Breadcrumbs items={[{ label: "Catálogo" }]} />
      <div className="spread catalog-heading">
        <div>
          <h1>Catálogo</h1>
          <p>
            Elige una familia para ver sus referencias. Cada ficha indica qué
            es, cómo se diferencia y dónde consultarla.
          </p>
        </div>
        <PdfAction />
      </div>
      <FamilyGrid detailed />
      <p className="muted small" style={{ marginTop: 24 }}>
        El PDF es un documento del negocio. Consulta la vigencia de sus
        condiciones y la disponibilidad antes de acudir; esta web no confirma
        stock ni tramita compras.
      </p>
    </div>
  );
}
