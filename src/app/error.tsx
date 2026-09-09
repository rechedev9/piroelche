"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container page-section">
      <p className="eyebrow">No se ha podido cargar la página</p>
      <h1>Vuelve a intentarlo.</h1>
      <p>
        Si el problema continúa, puedes consultar el teléfono y la dirección de
        la tienda en el pie de página.
      </p>
      <div className="flex-row">
        <Button onClick={reset}>Intentar de nuevo</Button>
        <Button asChild variant="outline">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
