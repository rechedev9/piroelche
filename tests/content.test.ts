import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { z } from "zod";
import {
  ChannelsSchema,
  ContentSchema,
  DemoContentSchema,
  FamilySchema,
  ImageSchema,
  PdfSchema,
  StoreSchema,
  SolutionSchema,
  VideoSchema,
  ProductSchema,
  selectPublishedContent,
  type Product,
} from "../src/lib/content-schema";

const rawSite = ContentSchema.parse(
  JSON.parse(readFileSync("content/site.json", "utf8")),
);
const rawDemo = DemoContentSchema.parse(
  JSON.parse(readFileSync("fixtures/catalog.json", "utf8")),
);
const ServerSummarySchema = z
  .object({
    isDemo: z.boolean(),
    refs: z.array(z.string()),
    families: z.array(z.string()),
    cases: z.number().int().nonnegative(),
    campaigns: z.number().int().nonnegative(),
    campaignIds: z.array(z.string()),
    byRef: z.string().nullable(),
    bySlug: z.string().nullable(),
    wrongFamily: z.null(),
    unknown: z.null(),
  })
  .strict();

function confirmedProduct(overrides: Partial<Product> = {}): Product {
  return ProductSchema.parse({
    ref: "TEST-01",
    slug: "referencia-de-prueba",
    familyId: "fuegos",
    name: "Referencia de prueba",
    summary: "Resumen de prueba",
    description: "Descripción de prueba",
    attributes: [],
    price: null,
    availability: "unknown",
    status: "published",
    provenance: {
      kind: "owner-confirmed",
      source: "Fuente de pruebas, no comercial",
      checkedAt: "2026-09-09",
      note: "Solo prueba unitaria",
      pending: [],
      verifiedFields: ["name", "summary", "description"],
    },
    ...overrides,
  });
}

function loadServer(environment: Record<string, string | undefined>) {
  const env = { ...process.env };
  for (const key of [
    "PIROBOOM_DEMO",
    "PIROBOOM_LOCAL_REVIEW",
    "REVIEW_CAMPAIGNS",
    "VERCEL",
    "VERCEL_ENV",
  ])
    delete env[key];
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  const script = `const c = require('./src/lib/content.ts'); const data = c.getContent(); process.stdout.write(JSON.stringify({ isDemo: data.isDemo, refs: data.products.map(p => p.ref), families: data.families.map(f => f.slug), cases: data.cases.length, campaigns: data.campaigns.length, campaignIds: data.campaigns.map(item => item.id), byRef: c.getProductByRef('FA-025')?.ref ?? null, bySlug: c.getProduct('fuegos-artificiales','bateria-25-disparos')?.ref ?? null, wrongFamily: c.getProduct('humo-de-color','bateria-25-disparos')?.ref ?? null, unknown: c.getProductByRef('NOT-A-PRODUCT') ?? null }));`;
  const child = spawnSync(
    process.execPath,
    ["--conditions=react-server", "--import=tsx", "--eval", script],
    { cwd: process.cwd(), env, encoding: "utf8", timeout: 20_000 },
  );
  assert.equal(child.status, 0, child.stderr || child.error?.message);
  return ServerSummarySchema.parse(JSON.parse(child.stdout));
}

void test("el contenido central publica familias y las cuatro casetas de la fuente sin inventar inventario o casos", () => {
  const content = ContentSchema.parse(rawSite);
  assert.deepEqual(
    content.families.map((family) => family.name),
    ["Fuegos artificiales", "Humo de color", "Fuego frío", "Tracas y otros"],
  );
  assert.equal(content.products.length, 0);
  assert.equal(content.cases.length, 0);
  assert.equal(content.campaigns.length, 4);
  assert.equal(content.store.phone, "+34600261620");
  assert.equal(
    content.store.directionsUrl,
    "https://maps.app.goo.gl/C1XJNPujKvKTfNPH9",
  );
  assert.equal(content.store.confirmedUntil, undefined);
  assert.equal(content.store.exceptionsConfirmedUntil, undefined);
  assert.equal(content.channels.whatsapp.enabled, true);
  assert.equal(content.channels.whatsapp.url, "https://wa.me/34600261620");
  assert.equal(content.store.landline?.phone, "+34966613009");
  assert.equal(content.channels.email, "pirotecnia_piroboom@hotmail.com");
  assert.equal(
    content.channels.social.instagram?.handle,
    "pirotecnia_piroboom",
  );
  assert.equal(content.occasions.length, 5);
  assert.deepEqual(
    content.solutions.map((item) => item.occasionId),
    ["boda", "revelacion", "fiesta"],
  );
});

void test("las casetas conservan direcciones y horarios exactos de Tiendas sin fechas ni mapas inventados", () => {
  assert.deepEqual(
    rawSite.campaigns.map(({ name, address }) => ({ name, address })),
    [
      { name: "Elche", address: "Avenida Novelda" },
      { name: "Alicante", address: "Avenida Alfonso El Sabio X" },
      { name: "Santa Pola", address: "Avenida Novelda" },
      { name: "La Zenia", address: "Avenida Novelda" },
    ],
  );
  for (const location of rawSite.campaigns) {
    assert.deepEqual(location.schedule, [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        intervals: [{ opens: "10:00", closes: "18:00" }],
      },
    ]);
    assert.deepEqual(location.campaign, { confirmed: false });
    assert.deepEqual(location.exceptions, []);
    assert.equal(location.confirmedUntil, undefined);
    assert.equal(location.exceptionsConfirmedUntil, undefined);
    assert.equal(location.directionsUrl, undefined);
    assert.equal(location.status, "published");
    assert.equal(location.provenance.kind, "primary-source");
    assert.equal(
      location.provenance.source,
      "https://pirotecniaelche.es/tiendas/",
    );
  }
});

void test("las diez referencias y los casos/casetas son fixtures draft con atribución explícita", () => {
  const demo = DemoContentSchema.parse(rawDemo);
  assert.deepEqual(
    demo.products.map((product) => product.ref),
    [
      "FA-025",
      "FA-100",
      "FA-007",
      "HU-R60",
      "HU-A60",
      "HU-B90",
      "FF-060",
      "FF-B40",
      "TR-100",
      "TR-TH",
    ],
  );
  assert.deepEqual(
    ["fuegos", "humo", "frio", "tracas"].map(
      (family) =>
        demo.products.filter((product) => product.familyId === family).length,
    ),
    [3, 3, 2, 2],
  );
  assert.equal(demo.cases.length, 3);
  assert.equal(demo.campaigns.length, 4);
  for (const product of demo.products) {
    assert.match(product.name, /ejemplo/);
    assert.ok(
      product.attributes.every((attribute) =>
        attribute.label.includes("ejemplo"),
      ),
    );
    assert.equal(product.availability, "unknown");
    assert.equal(product.price, null);
  }
  assert.equal(demo.products.filter((product) => product.video).length, 1);
  assert.match(demo.products[0].video!.caption, /no muestra un producto/);
  assert.equal(demo.products[0].video!.audio, "silent");
  assert.equal(demo.products[0].video!.captions, "/media-demo/captions/");
});

void test("el servidor público no resuelve fixtures ni rutas de producto inventadas", () => {
  const data = loadServer({});
  assert.equal(data.isDemo, false);
  assert.equal(data.families.length, 4);
  assert.deepEqual(data.refs, []);
  assert.equal(data.byRef, null);
  assert.equal(data.bySlug, null);
  assert.equal(data.unknown, null);
  assert.equal(data.cases, 0);
  assert.equal(data.campaigns, 4);
  assert.deepEqual(
    data.campaignIds,
    rawSite.campaigns.map((location) => location.id),
  );
});

void test("la demo requiere las dos opciones locales y conserva referencia/familia", () => {
  for (const environment of [
    { PIROBOOM_DEMO: "1" },
    { PIROBOOM_LOCAL_REVIEW: "1" },
    { PIROBOOM_DEMO: "true", PIROBOOM_LOCAL_REVIEW: "1" },
  ]) {
    assert.equal(loadServer(environment).isDemo, false);
  }
  const data = loadServer({ PIROBOOM_DEMO: "1", PIROBOOM_LOCAL_REVIEW: "1" });
  assert.equal(data.isDemo, true);
  assert.equal(data.refs.length, 10);
  assert.equal(data.byRef, "FA-025");
  assert.equal(data.bySlug, "FA-025");
  assert.equal(data.wrongFamily, null);
  assert.equal(data.cases, 3);
  assert.equal(data.campaigns, 4);
  assert.deepEqual(
    data.campaignIds,
    rawSite.campaigns.map((location) => location.id),
  );
});

void test("las campañas con fechas de ejemplo solo sustituyen las reales en QA local explícita", () => {
  for (const environment of [
    { REVIEW_CAMPAIGNS: "1" },
    { REVIEW_CAMPAIGNS: "1", PIROBOOM_DEMO: "1" },
    { REVIEW_CAMPAIGNS: "1", PIROBOOM_LOCAL_REVIEW: "1" },
    {
      REVIEW_CAMPAIGNS: "true",
      PIROBOOM_DEMO: "1",
      PIROBOOM_LOCAL_REVIEW: "1",
    },
  ]) {
    const data = loadServer(environment);
    assert.equal(data.campaigns, 4);
    assert.deepEqual(
      data.campaignIds,
      rawSite.campaigns.map((location) => location.id),
    );
  }
  const data = loadServer({
    REVIEW_CAMPAIGNS: "1",
    PIROBOOM_DEMO: "1",
    PIROBOOM_LOCAL_REVIEW: "1",
  });
  assert.equal(data.isDemo, true);
  assert.equal(data.refs.length, 10);
  assert.equal(data.cases, 3);
  assert.equal(data.campaigns, 4);
  assert.deepEqual(
    data.campaignIds,
    rawDemo.campaigns.map((location) => location.id),
  );
});

void test("Vercel impide activar la demo incluso con ambas opciones presentes", () => {
  for (const platform of [
    { VERCEL: "1" },
    { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "production" },
  ]) {
    const data = loadServer({
      PIROBOOM_DEMO: "1",
      PIROBOOM_LOCAL_REVIEW: "1",
      REVIEW_CAMPAIGNS: "1",
      ...platform,
    });
    assert.equal(data.isDemo, false);
    assert.deepEqual(data.refs, []);
    assert.equal(data.byRef, null);
    assert.equal(data.cases, 0);
    assert.equal(data.campaigns, 4);
    assert.deepEqual(
      data.campaignIds,
      rawSite.campaigns.map((location) => location.id),
    );
  }
});

void test("referencias retiradas, borradores, verificadas y caducadas no pasan el filtro público", () => {
  const content = ContentSchema.parse(rawSite);
  content.products = [
    confirmedProduct(),
    confirmedProduct({ ref: "TEST-02", slug: "archivada", status: "archived" }),
    confirmedProduct({ ref: "TEST-03", slug: "borrador", status: "draft" }),
    confirmedProduct({
      ref: "TEST-04",
      slug: "verificada",
      status: "verified",
    }),
    confirmedProduct({
      ref: "TEST-05",
      slug: "caducada",
      provenance: {
        ...confirmedProduct().provenance,
        validUntil: "2026-09-08",
      },
    }),
    confirmedProduct({
      ref: "TEST-06",
      slug: "vigente-hoy",
      provenance: {
        ...confirmedProduct().provenance,
        validUntil: "2026-09-09",
      },
    }),
  ];
  assert.deepEqual(
    selectPublishedContent(content, "2026-09-09").products.map(
      (item) => item.ref,
    ),
    ["TEST-01", "TEST-06"],
  );
  assert.deepEqual(
    selectPublishedContent(content, "2026-09-10").products.map(
      (item) => item.ref,
    ),
    ["TEST-01"],
  );
});

void test("cambiar status no transforma una fixture en referencia publicable", () => {
  assert.equal(
    ProductSchema.safeParse({ ...rawDemo.products[0], status: "published" })
      .success,
    false,
  );
  assert.equal(
    ProductSchema.safeParse({ ...rawDemo.products[0], status: "verified" })
      .success,
    false,
  );
  assert.equal(
    DemoContentSchema.safeParse({
      ...rawDemo,
      products: [{ ...rawDemo.products[0], status: "archived" }],
    }).success,
    false,
  );
});

void test("precio, stock y atributos necesitan comprobación separada; desconocido nunca es cero o agotado", () => {
  const product = confirmedProduct();
  assert.equal(product.price, null);
  assert.equal(product.availability, "unknown");
  assert.equal(
    ProductSchema.safeParse({ ...product, price: 0 }).success,
    false,
  );
  assert.equal(
    ProductSchema.safeParse({ ...product, availability: "in-stock" }).success,
    false,
  );
  assert.equal(
    ProductSchema.safeParse({ ...product, age: "+12" }).success,
    false,
  );
  assert.equal(
    ProductSchema.safeParse({
      ...product,
      attributes: [{ label: "Altura", value: "25 m" }],
    }).success,
    false,
  );
  assert.equal(
    ProductSchema.safeParse({
      ...product,
      provenance: { ...product.provenance, pending: ["Confirmar ficha"] },
    }).success,
    false,
  );
  assert.equal(
    ProductSchema.safeParse({
      ...product,
      price: 15,
      provenance: {
        ...product.provenance,
        verifiedFields: [...product.provenance.verifiedFields, "price"],
      },
    }).success,
    true,
  );
});

void test("el esquema rechaza IDs, slugs, familias y ocasiones inconsistentes", () => {
  const content = ContentSchema.parse(rawSite);
  assert.equal(
    ContentSchema.safeParse({
      ...content,
      families: [...content.families, content.families[0]],
    }).success,
    false,
  );
  assert.equal(
    ContentSchema.safeParse({
      ...content,
      products: [confirmedProduct(), confirmedProduct()],
    }).success,
    false,
  );
  assert.equal(
    ContentSchema.safeParse({
      ...content,
      products: [confirmedProduct({ familyId: "no-existe" })],
    }).success,
    false,
  );
  assert.equal(
    ContentSchema.safeParse({
      ...content,
      occasions: content.occasions.filter((occasion) => occasion.id !== "boda"),
    }).success,
    false,
  );
});

void test("los medios públicos deben ser locales, seguros y acreditados para su referencia", () => {
  const provenance = confirmedProduct().provenance;
  const image = {
    src: "/media/producto.webp",
    alt: "Artículo",
    width: 800,
    height: 600,
    provenance,
  };
  assert.equal(ImageSchema.safeParse(image).success, true);
  for (const src of [
    "javascript:alert(1)",
    "https://tercero.example/foto.jpg",
    "//tercero.example/a.png",
    "/media/%2e%2e/a.png",
    "/../secret.png",
    "data:image/png;base64,AA",
  ]) {
    assert.equal(ImageSchema.safeParse({ ...image, src }).success, false, src);
  }
  assert.equal(
    ProductSchema.safeParse({
      ...confirmedProduct(),
      image: { ...image, provenance: rawDemo.products[0].provenance },
    }).success,
    false,
  );
  assert.equal(
    StoreSchema.safeParse({
      ...rawSite.store,
      image: { ...image, provenance: rawDemo.products[0].provenance },
    }).success,
    false,
  );
  assert.equal(
    StoreSchema.safeParse({
      ...rawSite.store,
      provenance: rawDemo.products[0].provenance,
    }).success,
    false,
  );
});

void test("las fotos de familias y soluciones requieren procedencia comprobada", () => {
  const image = rawSite.store.image;
  assert.ok(image);
  const family = { ...rawSite.families[0], image };
  const solution = { ...rawSite.solutions[0], image };
  assert.equal(FamilySchema.safeParse(family).success, true);
  assert.equal(SolutionSchema.safeParse(solution).success, true);
  for (const provenance of [
    rawDemo.products[0].provenance,
    { ...image.provenance, checkedAt: undefined },
    { ...image.provenance, pending: ["Falta confirmar la imagen"] },
  ]) {
    const unconfirmed: unknown = { ...image, provenance };
    assert.equal(
      FamilySchema.safeParse({ ...family, image: unconfirmed }).success,
      false,
    );
    assert.equal(
      SolutionSchema.safeParse({ ...solution, image: unconfirmed }).success,
      false,
    );
  }
});

void test("el PDF local conserva exactamente el archivo indicado por el usuario", () => {
  assert.equal(rawSite.pdf.url, "/catalogos/catalogo-2026.pdf");
  const document = readFileSync("public/catalogos/catalogo-2026.pdf");
  assert.equal(document.length, rawSite.pdf.sizeBytes);
  assert.equal(document.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.equal(
    createHash("sha256").update(document).digest("hex"),
    "e4ac9f0c0cf181b154677aa2dfd9ef1c4e06abe039079640e4f07488fe667000",
  );
});

void test("el PDF admite su ruta local segura y mantiene URLs web sin aceptar traversal ni protocolos ejecutables", () => {
  for (const url of [
    "/catalogos/catalogo-2026.pdf",
    "https://pirotecniaelche.es/wp-content/uploads/2026/06/Catalogo-2026.pdf",
    "http://example.test/catalogo.pdf",
  ]) {
    assert.equal(
      PdfSchema.safeParse({ ...rawSite.pdf, url }).success,
      true,
      url,
    );
  }
  for (const url of [
    "//example.test/catalogo.pdf",
    "javascript:alert(1)",
    "data:application/pdf;base64,JVBERi0=",
    "file:///catalogo.pdf",
    "../catalogo.pdf",
    "/catalogos/../catalogo.pdf",
    "/catalogos/%2e%2e/catalogo.pdf",
    "/catalogos//catalogo.pdf",
    "/catalogos\\catalogo.pdf",
    "/catalogos/catalogo.pdf?download=1",
    "/catalogos/catalogo.pdf#page=1",
    "/catalogos/catalogo.html",
    "/catalogo.pdf",
  ]) {
    assert.equal(
      PdfSchema.safeParse({ ...rawSite.pdf, url }).success,
      false,
      url,
    );
  }
});

void test("no se añade edición/tamaño a un PDF no recuperado ni se activa WhatsApp sin revisión", () => {
  const pdf = ContentSchema.parse(rawSite).pdf;
  assert.equal(pdf.status, "verified");
  assert.equal(pdf.edition, "2026");
  assert.equal(pdf.sizeBytes, 81903612);
  assert.equal(
    PdfSchema.safeParse({ ...pdf, status: "external" }).success,
    false,
  );
  assert.equal(PdfSchema.safeParse({ ...pdf, url: null }).success, false);
  const { reviewedAt: _reviewedAt, ...whatsapp } = rawSite.channels.whatsapp;
  const channels = { ...rawSite.channels, whatsapp };
  assert.equal(
    ChannelsSchema.safeParse({
      ...channels,
      whatsapp: { ...whatsapp, enabled: true, url: null },
    }).success,
    false,
  );
  assert.equal(
    ChannelsSchema.safeParse({
      ...channels,
      whatsapp: {
        ...whatsapp,
        enabled: true,
        url: "https://wa.me/34600261620",
      },
    }).success,
    false,
  );
  assert.equal(
    ChannelsSchema.safeParse({
      ...channels,
      whatsapp: {
        ...whatsapp,
        enabled: true,
        url: "https://wa.me/34600261620",
        reviewedAt: "2026-09-10",
      },
    }).success,
    true,
  );
  assert.equal(
    ChannelsSchema.safeParse({ ...rawSite.channels, email: "no-es-correo" })
      .success,
    false,
  );
});

void test("el vídeo declara su audio explícitamente y exige subtítulos locales si tiene sonido", () => {
  const video = {
    src: "/media/articulo.mp4",
    caption: "Clip de prueba",
    provenance: confirmedProduct().provenance,
  };
  assert.equal(VideoSchema.safeParse(video).success, false);
  assert.equal(
    VideoSchema.safeParse({ ...video, audio: false }).success,
    false,
  );
  assert.equal(
    VideoSchema.safeParse({ ...video, audio: "silent" }).success,
    true,
  );
  assert.equal(
    VideoSchema.safeParse({ ...video, audio: "present" }).success,
    false,
  );
  assert.equal(
    VideoSchema.safeParse({
      ...video,
      audio: "present",
      captions: "/media/articulo.es.vtt",
    }).success,
    true,
  );
  assert.equal(
    VideoSchema.safeParse({
      ...video,
      audio: "present",
      captions: "/media/articulo-es.vtt",
    }).success,
    true,
  );
  for (const captions of [
    "https://tercero.example/subtitulos.vtt",
    "//tercero.example/a.vtt",
    "javascript:alert(1)",
    "/../privado.vtt",
  ]) {
    assert.equal(
      VideoSchema.safeParse({ ...video, audio: "present", captions }).success,
      false,
      captions,
    );
  }
  assert.equal(
    ProductSchema.safeParse({
      ...confirmedProduct(),
      video: { ...video, audio: "present" },
    }).success,
    false,
  );
  assert.equal(
    ProductSchema.safeParse({
      ...confirmedProduct(),
      video: { ...video, audio: "present", captions: "/media/articulo-es.vtt" },
    }).success,
    true,
  );
});
