import { CatalogueManifestSchema } from "../../src/lib/catalogue-schema";
import { boundedBody, type DriveFile } from "./drive";

function httpsUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error(
      "Se necesita una URL HTTPS sin credenciales en la dirección.",
    );
  return url;
}

export async function hasCatalogueChanged(
  file: DriveFile,
  manifestUrl: string,
  http: typeof fetch = fetch,
) {
  const response = await http(httpsUrl(manifestUrl), {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return true;
  if (!response.ok)
    throw new Error(
      `No se pudo consultar el catálogo publicado: HTTP ${response.status}.`,
    );
  const published = CatalogueManifestSchema.parse(
    JSON.parse((await boundedBody(response, 8 * 1024 * 1024)).toString("utf8")),
  );
  return published.source.md5 !== file.md5Checksum;
}

export async function requestDeployment(
  hookUrl: string,
  http: typeof fetch = fetch,
) {
  try {
    const response = await http(httpsUrl(hookUrl), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error("Deploy hook failed");
  } catch {
    // Never include the secret URL or response body in a log message.
    throw new Error(
      "No se pudo solicitar el despliegue. Revisa el deploy hook en el hosting.",
    );
  }
}
