import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Media } from "@/components/media";
import { getContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Sobre nosotros",
  "Conoce Piroboom, su tienda física en Elche y la atención para elegir artículos y consultar celebraciones.",
  "/sobre-nosotros/",
);
const blocks = [
  {
    title: "Quién te atiende",
    text: "Consulta con Piroboom antes de elegir una referencia. Explica qué buscas y dónde se celebrará para recibir orientación.",
  },
  {
    title: "La tienda",
    text: "El punto de venta de Elche está en Calle Gloria Fuertes. Consulta el horario y las excepciones antes de venir.",
  },
  {
    title: "Cómo asesoramos",
    text: "La fecha, el lugar y la ocasión son el punto de partida para valorar opciones y concretar las condiciones de cada consulta.",
  },
];
export default function About() {
  const { store } = getContent();
  return (
    <div className="container page-section about">
      <p className="eyebrow">Sobre nosotros</p>
      <h1 className="about-intro">
        Una tienda de pirotecnia en Elche para tus celebraciones.
      </h1>
      <p className="lead">
        Piroboom ofrece artículos pirotécnicos en tienda física y atiende
        consultas para bodas, revelaciones y fiestas. Aquí puedes conocer la
        tienda y cómo plantear tu celebración.
      </p>
      <div className="grid grid-3">
        {blocks.map((block) => (
          <section className="card" key={block.title}>
            <Media
              src={block.title === "La tienda" ? store.image?.src : undefined}
              alt={
                block.title === "La tienda" && store.image
                  ? store.image.alt
                  : block.title
              }
              ratio="3 / 2"
            />
            <div className="card-body">
              <h2
                style={{
                  font: '800 21px/1.25 var(--body-font, "Manrope Variable"), sans-serif',
                  marginBottom: 8,
                }}
              >
                {block.title}
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                {block.text}
              </p>
            </div>
          </section>
        ))}
      </div>
      <div className="spread next-step">
        <h2>¿Siguiente paso?</h2>
        <div className="flex-row">
          <Button asChild variant="yellow">
            <Link href="/tiendas/">Conocer la tienda</Link>
          </Button>
          <Button asChild variant="light-outline">
            <Link href="/eventos/">Consultar un evento</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
