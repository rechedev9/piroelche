import "server-only";
import manifest from "../../public/media/catalogo-2026/manifest.json";
import { toCatalogueIndexEntry } from "./catalogue-model";
export { cataloguePageHref } from "./catalogue-model";
import {
  CatalogueManifestSchema,
  describeCataloguePage,
} from "./catalogue-schema";
export type { CataloguePage } from "./catalogue-schema";

export const catalogue = CatalogueManifestSchema.parse(manifest);
export const cataloguePages = catalogue.pages;
export const catalogueIndex = cataloguePages.map(toCatalogueIndexEntry);
const pagesByFamily = new Map<string, typeof cataloguePages>();
for (const page of cataloguePages) {
  const familyIds =
    page.familyIds ??
    describeCataloguePage(page.sectionTitles.join("\n"), page.page).familyIds;
  for (const familyId of new Set(familyIds)) {
    const pages = pagesByFamily.get(familyId) ?? [];
    pages.push(page);
    pagesByFamily.set(familyId, pages);
  }
}

export function getCataloguePage(value: string | string[] | undefined) {
  const number =
    typeof value === "string" && /^\d{1,2}$/.test(value) ? Number(value) : 1;
  // The schema guarantees consecutive, ordered page numbers starting at one.
  return cataloguePages[number - 1] || cataloguePages[0];
}

export function getFamilyCataloguePages(familyId: string) {
  return pagesByFamily.get(familyId) ?? [];
}
