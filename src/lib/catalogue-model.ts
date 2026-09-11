import type { CataloguePage } from "./catalogue-schema";

/** Only the image data used by the interactive viewer crosses the RSC boundary. */
export type CataloguePageImage = Pick<
  CataloguePage,
  "page" | "title" | "src" | "width" | "height"
>;
export type CatalogueIndexEntry = Pick<
  CataloguePage,
  "page" | "title" | "thumb" | "thumbWidth" | "thumbHeight"
> & { searchText: string };

export function cataloguePageHref(page: number) {
  return `/catalogo-pdf/?pagina=${page}#lector`;
}

export function normalizeCatalogueSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function toCatalogueIndexEntry(
  page: CataloguePage,
): CatalogueIndexEntry {
  return {
    page: page.page,
    title: page.title,
    thumb: page.thumb,
    thumbWidth: page.thumbWidth,
    thumbHeight: page.thumbHeight,
    searchText: normalizeCatalogueSearch(
      `${page.page} ${page.title} ${page.description} ${page.text}`,
    ),
  };
}

export function toCataloguePageImage(page: CataloguePage): CataloguePageImage {
  return {
    page: page.page,
    title: page.title,
    src: page.src,
    width: page.width,
    height: page.height,
  };
}

export function catalogueSearchTerms(query: string) {
  return normalizeCatalogueSearch(query).trim().split(/\s+/).filter(Boolean);
}

export function searchCatalogue(
  entries: readonly CatalogueIndexEntry[],
  terms: readonly string[],
) {
  return entries.filter((entry) =>
    terms.every((term) => entry.searchText.includes(term)),
  );
}
