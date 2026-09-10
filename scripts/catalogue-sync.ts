import { appendFile, readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { driveClient, driveConfig, driveToken } from "./catalogue/drive";
import { prepareCatalogue } from "./catalogue/prepare";
import {
  hasCatalogueChanged,
  requestDeployment,
} from "./catalogue/publication";

async function main() {
  const { values } = parseArgs({
    options: {
      check: { type: "boolean" },
      prebuild: { type: "boolean" },
      file: { type: "string" },
      "output-dir": { type: "string", default: "public" },
      "request-deploy": { type: "boolean" },
    },
  });
  if (values.prebuild && process.env.CATALOGUE_SYNC_ENABLED !== "1") return;
  if (values["request-deploy"]) {
    await requestDeployment(process.env.CATALOGUE_DEPLOY_HOOK_URL || "");
    console.log(
      "Despliegue solicitado. El hosting debe terminar el build y publicarlo correctamente.",
    );
    return;
  }
  if (values.file && values.check)
    throw new Error("--check consulta Drive; no admite --file.");
  let bytes: Buffer;
  if (values.file) {
    bytes = await readFile(values.file);
  } else {
    const config = driveConfig();
    const client = driveClient(config, await driveToken(config));
    const file = await client.file();
    if (values.check) {
      const changed = await hasCatalogueChanged(
        file,
        process.env.CATALOGUE_PUBLISHED_MANIFEST_URL || "",
      );
      if (process.env.GITHUB_OUTPUT)
        await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
      console.log(
        changed
          ? "Hay una actualización pendiente del catálogo."
          : "El PDF publicado ya coincide con Drive.",
      );
      return;
    }
    bytes = await client.download(file);
  }
  const manifest = await prepareCatalogue(bytes, values["output-dir"], {
    edition: process.env.CATALOGUE_EDITION || undefined,
    onPage: (page, total) => console.log(`Preparada página ${page}/${total}.`),
  });
  console.log(
    `Catálogo ${manifest.edition} preparado: ${manifest.pages.length} páginas, versión ${manifest.source.sha256.slice(0, 12)}.`,
  );
}

main().catch((error: unknown) => {
  // Do not serialize request objects, credentials, private folder IDs or tokens.
  console.error(
    error instanceof z.ZodError
      ? "Configuración o manifiesto de catálogo inválido."
      : error instanceof Error
        ? error.message
        : "Falló la sincronización del catálogo.",
  );
  process.exitCode = 1;
});
