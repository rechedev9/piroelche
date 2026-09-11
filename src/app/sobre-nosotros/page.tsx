import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Media } from "@/components/media";
import { getContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Sobre nosotros: tienda de pirotecnia en Elche",
  "Conoce Piroboom, tienda física de pirotecnia en Elche (Alicante), y cómo te ayudamos a elegir artículos y a preparar tu celebración.",
  "/sobre-nosotros/",
);
export default function About() {
  const { brand, store } = getContent();
  const blocks = [
    {
      title: "Ven a conocernos",
      label: "Piroboom · Elche",
      text: "El punto de venta de Elche está en Calle Gloria Fuertes. Consulta el horario y las excepciones antes de venir: aquí puedes plantear tu idea y preguntar por los artículos.",
      image: brand?.storeWelcome || store.image,
    },
    {
      title: "La tienda",
      label: "Luz, color y celebración",
      text: "Fuegos artificiales, humo de color, fuego frío, tracas y otros artículos. Explora las familias y consulta la referencia que te interesa antes de acudir.",
      image: store.image,
    },
    {
      title: "Antes de elegir",
      label: "Cada ocasión tiene sus condiciones",
      text: "La fecha, el lugar y la ocasión son el punto de partida para valorar opciones y concretar las condiciones de cada consulta. No necesitas conocer de antemano el nombre de un producto.",
      image: brand?.storeDetail || store.image,
    },
  ];
  return (
    <div className="container page-section about brand-about">
      <div className="brand-page-intro">
        <p className="eyebrow brand-eyebrow">Sobre nosotros</p>
        <h1 className="about-intro">
          Una tienda de pirotecnia en Elche para tus celebraciones.
        </h1>
        <p className="lead">
          Piroboom ofrece artículos pirotécnicos en tienda física y atiende
          consultas para bodas, revelaciones y fiestas. Aquí puedes conocer la
          tienda y cómo plantear tu celebración.
        </p>
      </div>
      <div className="brand-about-grid">
        {blocks.map((block) => (
          <section className="card" key={block.title}>
            <Media
              src={block.image?.src}
              alt={block.image?.alt || "La tienda Piroboom en Elche"}
              ratio="3 / 2"
              fit={block.image?.fit}
            />
            <div className="card-body">
              <p className="eyebrow">{block.label}</p>
              <h2>{block.title}</h2>
              <p className="muted">{block.text}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="spread next-step brand-next-step">
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
