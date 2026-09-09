import { z } from "zod";
import manifest from "../../public/media/catalogo-2026/manifest.json";

const localPage = z
  .string()
  .regex(/^\/media\/catalogo-2026\/[a-z0-9-]+\.webp$/);
const PageSchema = z.object({
  page: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  src: localPage,
  thumb: localPage,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  text: z.string().min(1),
});

export type CataloguePage = z.infer<typeof PageSchema>;

export const cataloguePages = z
  .array(PageSchema)
  .length(16)
  .refine((pages) => pages.every((page, index) => page.page === index + 1), {
    message: "El catálogo debe conservar las 16 páginas originales en orden",
  })
  .parse(manifest.pages);

export function getCataloguePage(value: string | string[] | undefined) {
  const number =
    typeof value === "string" && /^\d{1,2}$/.test(value) ? Number(value) : 1;
  return (
    cataloguePages.find((page) => page.page === number) || cataloguePages[0]
  );
}

// These links point to the original printed sections, including shared pages.
// They do not assign a regulatory category or import unverified product fields.
const familyPages: Record<string, readonly number[]> = {
  fuegos: [3, 5, 6, 7, 11, 14, 15],
  humo: [12],
  frio: [13],
  tracas: [2, 4, 8, 9, 10, 13],
};

export function getFamilyCataloguePages(familyId: string) {
  const numbers = familyPages[familyId] || [];
  return cataloguePages.filter((page) => numbers.includes(page.page));
}

export function cataloguePageHref(page: number) {
  return `/catalogo-pdf/?pagina=${page}#lector`;
}
