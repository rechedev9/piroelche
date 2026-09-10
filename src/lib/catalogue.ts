import manifest from "../../public/media/catalogo-2026/manifest.json";
import {
  CatalogueManifestSchema,
  describeCataloguePage,
} from "./catalogue-schema";
export type { CataloguePage } from "./catalogue-schema";

export const catalogue = CatalogueManifestSchema.parse(manifest);
export const cataloguePages = catalogue.pages;

export function getCataloguePage(value: string | string[] | undefined) {
  const number =
    typeof value === "string" && /^\d{1,2}$/.test(value) ? Number(value) : 1;
  return (
    cataloguePages.find((page) => page.page === number) || cataloguePages[0]
  );
}

export function getFamilyCataloguePages(familyId: string) {
  return cataloguePages.filter((page) => {
    const families =
      page.familyIds ??
      describeCataloguePage(page.sectionTitles.join("\n"), page.page).familyIds;
    return families.some((id) => id === familyId);
  });
}

export function cataloguePageHref(page: number) {
  return `/catalogo-pdf/?pagina=${page}#lector`;
}
