import { z } from "zod";

export const MAX_CATALOGUE_PAGES = 64;
export const MAX_CATALOGUE_BYTES = 150 * 1024 * 1024;
export const FamilyIdSchema = z.enum(["fuegos", "humo", "frio", "tracas"]);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const imagePath = z
  .string()
  .regex(
    /^\/media\/(?:catalogo-2026|catalogue\/[a-f0-9]{64})\/[a-z0-9-]+\.webp$/,
  );
const ImageSchema = z.object({
  src: imagePath,
  width: z.number().int().positive().max(4000),
  height: z.number().int().positive().max(4000),
  sizeBytes: z.number().int().positive(),
  sha256,
});
export const CataloguePageSchema = ImageSchema.extend({
  page: z.number().int().positive(),
  title: z.string().min(1).max(250),
  description: z.string().min(1).max(1000),
  thumb: imagePath,
  thumbWidth: z.number().int().positive(),
  thumbHeight: z.number().int().positive(),
  thumbSizeBytes: z.number().int().positive(),
  thumbSha256: sha256,
  text: z.string().max(100_000),
  textUrl: z
    .string()
    .regex(
      /^\/media\/(?:catalogo-2026|catalogue\/[a-f0-9]{64})\/page-\d+\.txt$/,
    ),
  textSha256: sha256,
  sectionTitles: z.array(z.string()).default([]),
  familyIds: z.array(FamilyIdSchema).optional(),
});
export const CatalogueManifestSchema = z
  .object({
    schemaVersion: z.number().int(),
    edition: z.string().regex(/^20\d{2}$/),
    source: z.object({
      src: z
        .string()
        .regex(/^\/catalogos\/(?:catalogo-2026|[a-f0-9]{64})\.pdf$/),
      sizeBytes: z.number().int().positive().max(MAX_CATALOGUE_BYTES),
      sha256,
      md5: z
        .string()
        .regex(/^[a-f0-9]{32}$/)
        .optional(),
      pageCount: z.number().int().positive().max(MAX_CATALOGUE_PAGES),
    }),
    cover: ImageSchema,
    pages: z.array(CataloguePageSchema).min(1).max(MAX_CATALOGUE_PAGES),
  })
  .superRefine((manifest, ctx) => {
    if (
      manifest.pages.length !== manifest.source.pageCount ||
      manifest.pages.some((page, index) => page.page !== index + 1)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Páginas incompletas o fuera de orden",
      });
    }
    // A generated release cannot mix assets belonging to different PDFs.
    if (manifest.schemaVersion === 2) {
      const hash = manifest.source.sha256;
      const prefix = `/media/catalogue/${hash}/`;
      if (
        manifest.source.src !== `/catalogos/${hash}.pdf` ||
        !manifest.cover.src.startsWith(prefix) ||
        manifest.pages.some(
          (page) =>
            !page.src.startsWith(prefix) ||
            !page.thumb.startsWith(prefix) ||
            !page.textUrl.startsWith(prefix),
        )
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Los archivos deben pertenecer a la misma versión",
        });
      }
    } else if (manifest.schemaVersion !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Versión de manifiesto no admitida",
      });
    }
  });
export type CatalogueManifest = z.infer<typeof CatalogueManifestSchema>;
export type CataloguePage = z.infer<typeof CataloguePageSchema>;

export function normalizeCatalogueText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Printed section headings, never product attributes or regulatory categories.
// Matches work even when a heading is split across several PDF text runs.
const sections: {
  title: string;
  families: z.infer<typeof FamilyIdSchema>[];
}[] = [
  { title: "PARA LOS MÁS PEQUES", families: [] },
  { title: "GIRASUELO Y EFECTO TIERRA", families: ["fuegos"] },
  { title: "LOTES", families: ["tracas"] },
  { title: "EFECTO VOLADOR", families: ["fuegos"] },
  { title: "VOLCANES Y FUENTES", families: ["fuegos"] },
  { title: "MEGA FUENTES", families: ["fuegos"] },
  { title: "TRACAS", families: ["tracas"] },
  { title: "PETARDOS", families: ["tracas"] },
  { title: "SUPER PETARDOS", families: ["tracas"] },
  { title: "COHETES Y CANDELAS", families: ["fuegos"] },
  { title: "HUMO Y ANTORCHAS", families: ["humo"] },
  { title: "REVELACIÓN DE GÉNERO", families: ["humo"] },
  { title: "CARRETILLAS", families: ["tracas"] },
  { title: "SURTIDORES", families: ["frio"] },
  { title: "BATERIAS AUTOMÁTICAS", families: ["fuegos"] },
  { title: "SÚPER BATERÍAS AUTOMÁTICAS", families: ["fuegos"] },
];

export function describeCataloguePage(text: string, page: number) {
  const lines = text.split(/\n/).map(normalizeCatalogueText).filter(Boolean);
  const headings = new Set(
    lines.flatMap((_, i) =>
      [1, 2, 3].map((count) => lines.slice(i, i + count).join(" ")),
    ),
  );
  const matches = sections.filter(({ title }) => {
    const normalized = normalizeCatalogueText(title);
    // Canva can paint a heading several times to create a shadow or outline.
    const repeatedHeading = new RegExp(
      `^(?:${normalized})(?: ${normalized})*(?: 20\\d{2})*$`,
    );
    return [...headings].some((heading) => repeatedHeading.test(heading));
  });
  const longest = matches.filter(
    ({ title }) =>
      !matches.some(
        (other) =>
          other.title !== title &&
          normalizeCatalogueText(other.title).includes(
            normalizeCatalogueText(title),
          ),
      ),
  );
  return {
    title: page === 1 ? "Portada" : longest[0]?.title || `Página ${page}`,
    description: `Página ${page} del catálogo de Piroboom.`,
    sectionTitles: page === 1 ? [] : longest.map(({ title }) => title),
    familyIds:
      page === 1
        ? []
        : [...new Set(matches.flatMap(({ families }) => families))],
  };
}
