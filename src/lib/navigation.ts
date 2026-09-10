import type { OccasionId } from "./content-schema";

export const navigation = [
  { href: "/", label: "Inicio" },
  { href: "/sobre-nosotros/", label: "Sobre nosotros" },
  { href: "/eventos/", label: "Eventos" },
  { href: "/tiendas/", label: "Tiendas" },
  { href: "/catalogo-pdf/", label: "Catálogo PDF" },
  { href: "/contacto/", label: "Contacto" },
] as const;

export const legalNavigation = [
  { href: "/politica-de-privacidad/", label: "Política de privacidad" },
  { href: "/politica-de-cookies/", label: "Cookies" },
  { href: "/aviso-legal/", label: "Aviso legal" },
] as const;

/** Request form on Eventos, optionally preselecting a published occasion. */
export function eventRequestHref(occasionId?: OccasionId) {
  return occasionId
    ? `/eventos/?ocasion=${occasionId}#solicitud`
    : "/eventos/#solicitud";
}
