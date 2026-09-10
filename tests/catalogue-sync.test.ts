import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PDFDocument, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";
import original from "../public/media/catalogo-2026/manifest.json";
import {
  boundedBody,
  driveClient,
  type DriveFile,
} from "../scripts/catalogue/drive";
import { MANIFEST_PATH, prepareCatalogue } from "../scripts/catalogue/prepare";
import {
  hasCatalogueChanged,
  requestDeployment,
} from "../scripts/catalogue/publication";
import {
  CatalogueManifestSchema,
  describeCataloguePage,
} from "../src/lib/catalogue-schema";

const digest = (data: Buffer, algorithm = "sha256") =>
  createHash(algorithm).update(data).digest("hex");

// A real, small, searchable PDF with an embedded repository font.
assert.ok(
  GlobalFonts.registerFromPath(
    "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
    "Test Manrope",
  ),
);
function pdfFixture(pages: string[][]) {
  const pdf = new PDFDocument();
  for (const lines of pages) {
    const ctx = pdf.beginPage(400, 600);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 400, 600);
    ctx.fillStyle = "black";
    ctx.font = '16px "Test Manrope"';
    lines.forEach((line, index) => ctx.fillText(line, 20, 50 + index * 40));
    pdf.endPage();
  }
  return pdf.close();
}

void test("Drive finds the exact named file, supports replacement IDs and validates the downloaded bytes", async () => {
  const bytes = Buffer.from("%PDF-1.7\nexample");
  let id = "original-file";
  const config = { folderId: "private-folder", fileName: "cat'alogo.pdf" };
  const http: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    assert.equal(url.origin, "https://www.googleapis.com");
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer test-token",
    );
    if (url.pathname.endsWith("/files")) {
      assert.match(
        url.searchParams.get("q") || "",
        /'private-folder' in parents/,
      );
      assert.match(url.searchParams.get("q") || "", /cat\\'alogo.pdf/);
      return Response.json({
        files: [
          {
            id,
            name: config.fileName,
            mimeType: "application/pdf",
            size: String(bytes.length),
            md5Checksum: digest(bytes, "md5"),
          },
        ],
      });
    }
    assert.equal(url.pathname, `/drive/v3/files/${id}`);
    assert.equal(url.searchParams.get("alt"), "media");
    return new Response(bytes);
  };
  const client = driveClient(config, "test-token", http);
  assert.deepEqual(await client.download(await client.file()), bytes);
  id = "replacement-file";
  assert.equal((await client.file()).id, id);
});

void test("Drive stops on missing/duplicate/non-PDF files and incomplete searches", async () => {
  const valid = {
    id: "file",
    name: "catalogo.pdf",
    mimeType: "application/pdf",
    size: "20",
    md5Checksum: "a".repeat(32),
  };
  for (const payload of [
    { files: [] },
    { files: [valid, valid] },
    { files: [valid], nextPageToken: "more" },
    { files: [valid], incompleteSearch: true },
    { files: [{ ...valid, mimeType: "text/html" }] },
    { files: [{ ...valid, size: "999999999" }] },
  ]) {
    const client = driveClient(
      { folderId: "folder", fileName: "catalogo.pdf" },
      "token",
      async () => Response.json(payload),
    );
    await assert.rejects(client.file());
  }
  const client = driveClient(
    { folderId: "folder", fileName: "catalogo.pdf" },
    "token",
    async () => new Response("private details", { status: 403 }),
  );
  await assert.rejects(client.file(), /HTTP 403/);
});

void test("downloads reject changed, truncated, oversized and fake PDF content", async () => {
  const originalBytes = Buffer.from("%PDF-1.7\ncontent");
  const file: DriveFile = {
    id: "file",
    name: "catalogo.pdf",
    mimeType: "application/pdf",
    size: originalBytes.length,
    md5Checksum: digest(originalBytes, "md5"),
  };
  for (const bytes of [
    Buffer.from("%PDF-1.7\nchanged"),
    originalBytes.subarray(0, 9),
  ]) {
    const client = driveClient(
      { folderId: "folder", fileName: "catalogo.pdf" },
      "token",
      async () => new Response(bytes),
    );
    await assert.rejects(client.download(file), /incompleto/);
  }
  const html = Buffer.from("<html>login</html>");
  const client = driveClient(
    { folderId: "folder", fileName: "catalogo.pdf" },
    "token",
    async () => new Response(html),
  );
  await assert.rejects(
    client.download({
      ...file,
      size: html.length,
      md5Checksum: digest(html, "md5"),
    }),
    /no contiene un PDF/,
  );
  await assert.rejects(boundedBody(new Response("abcdef"), 5), /tamaño/);
});

void test("PDF preparation regenerates a complete searchable edition, handles fewer pages, and preserves the previous manifest on failures", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "piroboom-catalogue-"),
  );
  try {
    const bytes = pdfFixture([
      ["CATALOGO 2027", "pirotecniaelche.es"],
      ["HUMO Y ANTORCHAS", "Niebla nueva 15 euros"],
      ["CARRETILLAS", "SURTIDORES", "Surtidor 5 metros"],
    ]);
    const manifest = await prepareCatalogue(bytes, directory);
    assert.equal(manifest.edition, "2027");
    assert.equal(manifest.pages.length, 3);
    assert.equal(manifest.source.sha256, digest(bytes));
    assert.deepEqual(
      await readFile(path.join(directory, manifest.source.src)),
      bytes,
    );
    assert.deepEqual(manifest.pages[1].familyIds, ["humo"]);
    assert.deepEqual(manifest.pages[2].familyIds, ["tracas", "frio"]);
    assert.match(manifest.pages[1].text, /Niebla nueva/);
    for (const page of manifest.pages) {
      const image = await readFile(path.join(directory, page.src));
      assert.equal(digest(image), page.sha256);
      const metadata = await sharp(image).metadata();
      assert.equal(metadata.width, page.width);
      assert.equal(metadata.height, page.height);
      assert.equal(
        await readFile(path.join(directory, page.textUrl), "utf8"),
        page.text,
      );
      assert.equal(
        digest(await readFile(path.join(directory, page.thumb))),
        page.thumbSha256,
      );
    }
    const activePath = path.join(directory, MANIFEST_PATH);
    const active = await readFile(activePath, "utf8");
    for (const invalid of [
      Buffer.from("not a PDF"),
      pdfFixture([["CATALOGO 2027", "www.piroboom.es"]]),
      pdfFixture([["Portada sin fecha"]]),
    ]) {
      await assert.rejects(prepareCatalogue(invalid, directory));
      assert.equal(await readFile(activePath, "utf8"), active);
    }
    await assert.rejects(
      prepareCatalogue(bytes, directory, {
        onPage: () => {
          throw new Error("render interrupted");
        },
      }),
      /render interrupted/,
    );
    assert.equal(await readFile(activePath, "utf8"), active);
    assert.ok(
      !(await readdir(directory)).some((name) =>
        name.startsWith(".catalogue-"),
      ),
    );
    const replacement = await prepareCatalogue(
      pdfFixture([["CATALOGO 2028", "pirotecniaelche.es"]]),
      directory,
    );
    assert.equal(replacement.pages.length, 1);
    assert.equal(replacement.edition, "2028");
    assert.notEqual(replacement.cover.src, manifest.cover.src);
    assert.equal(
      CatalogueManifestSchema.parse(
        JSON.parse(await readFile(activePath, "utf8")),
      ).source.sha256,
      replacement.source.sha256,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

void test("navigation metadata permits more than 16 pages and rejects mixed or incomplete snapshots", () => {
  const pages = Array.from({ length: 17 }, (_, index) => ({
    ...original.pages[0],
    page: index + 1,
  }));
  const manifest = {
    ...original,
    source: { ...original.source, pageCount: 17 },
    pages,
  };
  assert.equal(CatalogueManifestSchema.parse(manifest).pages.length, 17);
  assert.equal(
    CatalogueManifestSchema.safeParse({ ...manifest, pages: pages.slice(1) })
      .success,
    false,
  );
  assert.equal(
    CatalogueManifestSchema.safeParse({ ...manifest, schemaVersion: 2 })
      .success,
    false,
  );
  assert.deepEqual(
    describeCataloguePage("CARRETILLAS\nSURTIDORES", 4).familyIds,
    ["tracas", "frio"],
  );
  assert.deepEqual(
    describeCataloguePage("Un producto con humo y petardos", 4).familyIds,
    [],
  );
  assert.deepEqual(
    describeCataloguePage(
      "HUMO Y ANTORCHAS HUMO Y ANTORCHAS HUMO Y ANTORCHAS\n2027",
      5,
    ).familyIds,
    ["humo"],
  );
});

void test("the daily check skips unchanged content and retries until the new checksum is actually published", async () => {
  const file: DriveFile = {
    id: "file",
    name: "catalogo.pdf",
    mimeType: "application/pdf",
    size: 200,
    md5Checksum: "a".repeat(32),
  };
  const published = {
    ...original,
    source: { ...original.source, md5: file.md5Checksum },
  };
  const url = "https://example.test/media/catalogo-2026/manifest.json";
  assert.equal(
    await hasCatalogueChanged(file, url, async (_, init) => {
      assert.equal(init?.cache, "no-store");
      return Response.json(published);
    }),
    false,
  );
  assert.equal(
    await hasCatalogueChanged(
      { ...file, md5Checksum: "b".repeat(32) },
      url,
      async () => Response.json(published),
    ),
    true,
  );
  assert.equal(
    await hasCatalogueChanged(
      file,
      url,
      async () => new Response(null, { status: 404 }),
    ),
    true,
  );
  await assert.rejects(
    hasCatalogueChanged(
      file,
      url,
      async () => new Response(null, { status: 503 }),
    ),
    /503/,
  );
  await assert.rejects(
    hasCatalogueChanged(file, url, async () =>
      Response.json({ source: { md5: file.md5Checksum } }),
    ),
  );
  let calls = 0;
  await requestDeployment(
    "https://example.test/secret-hook",
    async (_, init) => {
      calls++;
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      return new Response(null, { status: 202 });
    },
  );
  assert.equal(calls, 1);
  // An accepted hook does not mark an unpublished PDF as current.
  assert.equal(
    await hasCatalogueChanged(
      { ...file, md5Checksum: "b".repeat(32) },
      url,
      async () => Response.json(published),
    ),
    true,
  );
  await assert.rejects(
    requestDeployment("https://example.test/secret-hook", async () => {
      throw new Error("secret-hook");
    }),
    (error: unknown) =>
      error instanceof Error && !error.message.includes("secret-hook"),
  );
});
