import { createHash } from "node:crypto";
import { JWT } from "google-auth-library";
import { z } from "zod";
import { MAX_CATALOGUE_BYTES } from "../../src/lib/catalogue-schema";

const CredentialsSchema = z.object({
  type: z.literal("service_account"),
  client_email: z.email(),
  private_key: z.string().min(100),
});
const FileSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string(),
  mimeType: z.literal("application/pdf"),
  size: z.coerce.number().int().positive().max(MAX_CATALOGUE_BYTES),
  md5Checksum: z.string().regex(/^[a-f0-9]{32}$/),
});
export type DriveFile = z.infer<typeof FileSchema>;
export type DriveConfig = ReturnType<typeof driveConfig>;
const escapeQuery = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export function driveConfig(env: NodeJS.ProcessEnv = process.env) {
  const folderId = env.CATALOGUE_DRIVE_FOLDER_ID || "";
  if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
    throw new Error("Falta CATALOGUE_DRIVE_FOLDER_ID o no es un ID válido.");
  }
  const fileName = env.CATALOGUE_DRIVE_FILE_NAME || "catalogo.pdf";
  if (fileName.length > 150 || !/^[^/\\\r\n]+\.pdf$/i.test(fileName)) {
    throw new Error(
      "CATALOGUE_DRIVE_FILE_NAME debe ser un nombre de archivo PDF.",
    );
  }
  let credentials: z.infer<typeof CredentialsSchema>;
  try {
    credentials = CredentialsSchema.parse(
      JSON.parse(env.CATALOGUE_GOOGLE_SERVICE_ACCOUNT_JSON || ""),
    );
  } catch {
    throw new Error(
      "Configura CATALOGUE_GOOGLE_SERVICE_ACCOUNT_JSON con la clave de la cuenta de servicio.",
    );
  }
  return { folderId, fileName, credentials };
}

export async function driveToken(config: DriveConfig) {
  const auth = new JWT({
    email: config.credentials.client_email,
    key: config.credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  try {
    const { token } = await auth.getAccessToken();
    if (!token) throw new Error("No token");
    return token;
  } catch {
    // Authentication library errors may include request headers or credentials.
    throw new Error(
      "No se pudo autenticar con Google Drive. Revisa la cuenta de servicio.",
    );
  }
}

export async function boundedBody(response: Response, maxBytes: number) {
  const advertised = Number(response.headers.get("content-length"));
  if (advertised > maxBytes)
    throw new Error("La descarga supera el tamaño permitido.");
  if (!response.body) throw new Error("La descarga está vacía.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes)
        throw new Error("La descarga supera el tamaño permitido.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

export function driveClient(
  config: Pick<DriveConfig, "folderId" | "fileName">,
  token: string,
  http: typeof fetch = fetch,
) {
  async function request(url: URL) {
    const response = await http(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(120_000),
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(`Google Drive devolvió HTTP ${response.status}.`);
    return response;
  }
  return {
    async file(): Promise<DriveFile> {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.search = new URLSearchParams({
        q: `'${config.folderId}' in parents and trashed = false and name = '${escapeQuery(config.fileName)}'`,
        fields:
          "files(id,name,mimeType,size,md5Checksum),nextPageToken,incompleteSearch",
        pageSize: "2",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      }).toString();
      const body = await boundedBody(await request(url), 64 * 1024);
      const result = z
        .object({
          files: z.array(z.unknown()),
          nextPageToken: z.string().optional(),
          incompleteSearch: z.boolean().optional(),
        })
        .parse(JSON.parse(body.toString("utf8")));
      if (result.incompleteSearch)
        throw new Error("Google Drive no pudo completar la búsqueda.");
      if (result.files.length !== 1 || result.nextPageToken) {
        throw new Error(
          "La carpeta debe contener exactamente un PDF con el nombre configurado. No se elige entre duplicados.",
        );
      }
      const file = FileSchema.safeParse(result.files[0]);
      if (!file.success)
        throw new Error(
          "El archivo de Drive debe ser un PDF de hasta 150 MiB con checksum disponible.",
        );
      if (file.data.name !== config.fileName)
        throw new Error("El nombre del archivo no coincide.");
      return file.data;
    },
    async download(file: DriveFile) {
      const url = new URL(
        `https://www.googleapis.com/drive/v3/files/${file.id}`,
      );
      url.search = "alt=media&supportsAllDrives=true";
      const bytes = await boundedBody(await request(url), MAX_CATALOGUE_BYTES);
      if (
        bytes.length !== file.size ||
        createHash("md5").update(bytes).digest("hex") !== file.md5Checksum
      ) {
        throw new Error(
          "El PDF cambió durante la descarga o llegó incompleto. Se reintentará en la siguiente ejecución.",
        );
      }
      if (!bytes.subarray(0, 8).toString("ascii").startsWith("%PDF-")) {
        throw new Error("La descarga no contiene un PDF.");
      }
      return bytes;
    },
  };
}
