import Image from "next/image";
import Link from "next/link";
import { getContent } from "@/lib/content";
import { formatSchedule } from "@/lib/hours";
import { legalNavigation, navigation } from "@/lib/navigation";
import { TrackedLink } from "./tracked-link";

export function Footer() {
  const { store } = getContent();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label="Piroboom, inicio">
            <Image
              src="/brand/logo-header.webp"
              alt="Piroboom, pirotecnia en Elche"
              width={680}
              height={276}
              sizes="(max-width: 650px) 160px, 200px"
            />
          </Link>
          <p>
            Pirotecnia en Elche. Consulta artículos y opciones para tu
            celebración; visita la tienda.
          </p>
        </div>
        <div>
          <h2>Tienda Elche</h2>
          <p>{store.address}</p>
          <ul className="footer-hours">
            {formatSchedule(store.schedule).map((row) => (
              <li key={row.days}>
                {row.days}: {row.hours}
              </li>
            ))}
          </ul>
          <p className="footer-note">
            Horario habitual publicado. Confirma festivos.
          </p>
          <TrackedLink
            className="footer-phone"
            href={`tel:${store.phone}`}
            event={{ name: "click_call" }}
          >
            {store.phoneDisplay}
          </TrackedLink>
        </div>
        <div>
          <h2>Secciones</h2>
          <nav aria-label="Secciones del pie">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <h2>Legal</h2>
          <nav aria-label="Información legal">
            {legalNavigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="legal-note">
            Catálogo y consulta, con atención en tienda. No se tramitan pagos ni
            envíos a domicilio desde esta web.
          </p>
        </div>
      </div>
    </footer>
  );
}
