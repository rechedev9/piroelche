import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import {
  CatalogueManifestSchema,
  describeCataloguePage,
  MAX_CATALOGUE_BYTES,
  MAX_CATALOGUE_PAGES,
  normalizeCatalogueText,
  type CataloguePage,
} from "../../src/lib/catalogue-schema";

export const MANIFEST_PATH = "media/catalogo-2026/manifest.json";
const hash = (bytes: Uint8Array | string, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");

/** Prepare a complete build snapshot. Run in a build checkout, never in a live public directory. */
export async function prepareCatalogue(
  bytes: Buffer,
  publicDirectory: string,
  options: {
    edition?: string;
    onPage?: (page: number, total: number) => void;
  } = {},
) {
  if (
    bytes.length > MAX_CATALOGUE_BYTES ||
    !bytes.subarray(0, 8).toString("ascii").startsWith("%PDF-")
  ) {
    throw new Error("Se necesita un PDF válido de hasta 150 MiB.");
  }
  const digest = hash(bytes);
  const publicRoot = path.resolve(publicDirectory);
  const stage = path.join(publicRoot, `.catalogue-${randomUUID()}`);
  await mkdir(stage, { recursive: true });
  // PDF.js is only loaded by this build script, never by the public reader.
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const require = createRequire(import.meta.url);
  const pdfRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
  const task = getDocument({
    data: new Uint8Array(bytes),
    stopAtErrors: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    // PDF.js requires its resource roots to end in a URL slash. Windows accepts
    // this mixed-separator filesystem path when its Node factory reads the file.
    cMapUrl: path.join(pdfRoot, "cmaps") + "/",
    standardFontDataUrl: path.join(pdfRoot, "standard_fonts") + "/",
    wasmUrl: path.join(pdfRoot, "wasm") + "/",
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages < 1 || pdf.numPages > MAX_CATALOGUE_PAGES) {
      throw new Error(
        `El catálogo debe tener entre 1 y ${MAX_CATALOGUE_PAGES} páginas.`,
      );
    }
    const pages: CataloguePage[] = [];
    const mediaPrefix = `/media/catalogue/${digest}`;
    let edition = options.edition;
    let cover;
    async function saveImage(name: string, png: Buffer, width: number) {
      const { data, info } = await sharp(png)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer({ resolveWithObject: true });
      await writeFile(path.join(stage, name), data);
      return {
        src: `${mediaPrefix}/${name}`,
        width: info.width,
        height: info.height,
        sizeBytes: data.length,
        sha256: hash(data),
      };
    }
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const sectionText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join("\n");
      const text =
        content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("")
          .replace(/[ \t]+/g, " ")
          .replace(/ *\n */g, "\n")
          .trim() + "\n";
      if (/\b(?:www\s*\.\s*)?piroboom\s*\.\s*es\b/i.test(text)) {
        throw new Error(
          `La página ${number} aún contiene piroboom.es. Corrige el dominio en Canva y vuelve a exportar.`,
        );
      }
      if (number === 1 && !edition) {
        const years = [
          ...new Set(normalizeCatalogueText(text).match(/\b20\d{2}\b/g)),
        ];
        if (years.length !== 1)
          throw new Error(
            "No se puede determinar la edición desde la portada. Configura CATALOGUE_EDITION.",
          );
        edition = years[0];
      }
      const base = page.getViewport({ scale: 1 });
      if (
        !Number.isFinite(base.width) ||
        !Number.isFinite(base.height) ||
        base.width <= 0 ||
        base.height <= 0
      ) {
        throw new Error(`Dimensiones inválidas en la página ${number}.`);
      }
      const viewport = page.getViewport({
        scale: Math.min(1600 / base.width, 2800 / base.height),
      });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      // PDF.js declares the browser context type; its Node renderer also supports Skia.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const pdfContext = canvas.getContext(
        "2d",
      ) as unknown as CanvasRenderingContext2D;
      await page.render({
        canvas: null,
        canvasContext: pdfContext,
        viewport,
      }).promise;
      const png = await canvas.encode("png");
      const stem = `page-${String(number).padStart(2, "0")}`;
      const image = await saveImage(`${stem}.webp`, png, canvas.width);
      const thumb = await saveImage(`${stem}-thumb.webp`, png, 320);
      if (number === 1) cover = await saveImage("cover.webp", png, 800);
      await writeFile(path.join(stage, `${stem}.txt`), text);
      pages.push({
        ...image,
        ...describeCataloguePage(sectionText, number),
        page: number,
        thumb: thumb.src,
        thumbWidth: thumb.width,
        thumbHeight: thumb.height,
        thumbSizeBytes: thumb.sizeBytes,
        thumbSha256: thumb.sha256,
        text,
        textUrl: `${mediaPrefix}/${stem}.txt`,
        textSha256: hash(text),
      });
      canvas.width = 1;
      canvas.height = 1;
      page.cleanup();
      options.onPage?.(number, pdf.numPages);
    }
    const manifest = CatalogueManifestSchema.parse({
      schemaVersion: 2,
      edition,
      cover,
      pages,
      source: {
        src: `/catalogos/${digest}.pdf`,
        sizeBytes: bytes.length,
        sha256: digest,
        md5: hash(bytes, "md5"),
        pageCount: pdf.numPages,
      },
    });
    // Validate all metadata before switching the manifest. A build failure leaves
    // the deployed site untouched; hash-named files also avoid stale image caches.
    const mediaDirectory = path.join(publicRoot, "media/catalogue", digest);
    await mkdir(path.dirname(mediaDirectory), { recursive: true });
    await rm(mediaDirectory, { recursive: true, force: true });
    await rename(stage, mediaDirectory);
    await mkdir(path.join(publicRoot, "catalogos"), { recursive: true });
    const pdfTemporary = path.join(
      publicRoot,
      "catalogos",
      `.${randomUUID()}.pdf`,
    );
    await writeFile(pdfTemporary, bytes);
    await rename(pdfTemporary, path.join(publicRoot, manifest.source.src));
    const manifestPath = path.join(publicRoot, MANIFEST_PATH);
    await mkdir(path.dirname(manifestPath), { recursive: true });
    const manifestTemporary = `${manifestPath}.${randomUUID()}.tmp`;
    await writeFile(
      manifestTemporary,
      JSON.stringify(manifest, null, 2) + "\n",
    );
    await rename(manifestTemporary, manifestPath);
    return manifest;
  } finally {
    await task.destroy();
    await rm(stage, { recursive: true, force: true });
  }
}
