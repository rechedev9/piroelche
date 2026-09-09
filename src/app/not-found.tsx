import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container page-section not-found">
      <p className="eyebrow">404 · Página no disponible</p>
      <h1>No encontramos lo que buscas.</h1>
      <p className="intro">
        La dirección no existe o la referencia ya no está publicada. Puedes
        volver al catálogo o consultar con Piroboom.
      </p>
      <div className="flex-row">
        <Button asChild>
          <Link href="/catalogo-pdf/">Volver al catálogo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contacto/">Hacer una consulta</Link>
        </Button>
      </div>
    </div>
  );
}
