import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";

const publicationOrigin = "http://127.0.0.1:3001";
const familyPath = "/catalogo-pdf/fuegos-artificiales/";
const fixturePath = familyPath + "bateria-25-disparos/";
const publicRoutes = [
  "/",
  "/sobre-nosotros/",
  "/eventos/",
  "/tiendas/",
  "/catalogo-pdf/",
  "/contacto/",
  "/politica-de-privacidad/",
  "/politica-de-cookies/",
  "/aviso-legal/",
];
const disabledResponseSchema = z
  .object({
    ok: z.literal(false),
    code: z.literal("not_configured"),
    message: z.string().min(1),
  })
  .strict();

test("T01,T17 · rutas de publicación, metadatos y noindex sin material de demostración", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const titles = new Set<string>();
  for (const path of publicRoutes) {
    const response = await page.goto(publicationOrigin + path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    titles.add(await page.title());
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /.+/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://pirotecniaelche.es" + path,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      "https://pirotecniaelche.es" + path,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("note")).toHaveCount(0);
    await expect(page.getByRole("main")).not.toContainText(
      /Batería 25 disparos|Boda en finca · Elche|Caseta Carrús/,
    );
    expect((await page.reload())?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  }
  expect(titles.size).toBe(publicRoutes.length);
  const sitemap = await request.get(publicationOrigin + "/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toMatch(
    /<loc>|FA-025|bateria-25-disparos|caso-ejemplo/,
  );
  const robots = await request.get(publicationOrigin + "/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/Disallow: \/\s/);
});

test("las imágenes configuradas se muestran y decodifican desde el propio sitio", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/tiendas/",
    "/sobre-nosotros/",
    "/catalogo-pdf/",
    "/eventos/",
    "/contacto/",
  ]) {
    await page.goto(publicationOrigin + path);
    const photos = page.locator("main .media img");
    expect(await photos.count()).toBeGreaterThan(0);
    await expect(page.locator("main .media-note")).toHaveCount(0);
    if (path === "/sobre-nosotros/") await expect(photos).toHaveCount(3);
    if (path === "/eventos/")
      await expect(page.locator(".solution .media img")).toHaveCount(3);
    if (path === "/catalogo-pdf/")
      await expect(page.locator(".catalog-families .media img")).toHaveCount(4);
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          photo.evaluate(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        )
        .toBe(true);
      expect(
        await photo.evaluate((image) =>
          image instanceof HTMLImageElement
            ? new URL(image.currentSrc).origin
            : "",
        ),
      ).toBe(publicationOrigin);
      const alternative = await photo.getAttribute("alt");
      if (!alternative) {
        expect(
          await photo.evaluate((image) =>
            image
              .closest("figure")
              ?.querySelector("figcaption")
              ?.textContent?.trim(),
          ),
        ).toBeTruthy();
      }
    }
    if (path === "/") {
      await expect(page.locator(".hero img")).toHaveCount(1);
      await expect(page.locator(".hero-background")).toHaveCount(0);
    }
  }
});

test("T14,T17 · estados vacíos y parámetros públicos no activan fixtures", async ({
  page,
  request,
}) => {
  const query = "?demo=1&PIROBOOM_DEMO=1&PIROBOOM_LOCAL_REVIEW=1&preview=1";
  await page.goto(publicationOrigin + familyPath + query);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fuegos artificiales",
  );
  await expect(
    page.getByRole("heading", { name: "En el catálogo 2026", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".family-page-card")).toHaveCount(7);
  await expect(page.locator(".product-card")).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: "Pregúntanos por un artículo →",
      exact: true,
    }),
  ).toHaveAttribute("href", "/contacto/?motivo=producto");
  await page.goto(publicationOrigin + "/eventos/" + query);
  await expect(
    page.getByRole("heading", {
      name: "Luz y color, en imágenes",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".brand-gallery figure")).toHaveCount(3);
  await expect(page.locator(".cases")).toHaveCount(0);
  await page.goto(publicationOrigin + "/tiendas/" + query);
  await expect(page.locator(".campaign-card")).toHaveCount(4);
  for (const [name, address] of [
    ["Elche", "Avenida Novelda"],
    ["Alicante", "Avenida Alfonso El Sabio X"],
    ["Santa Pola", "Avenida Novelda"],
    ["La Zenia", "Avenida Novelda"],
  ]) {
    const point = page.locator(".campaign-card").filter({
      has: page.getByRole("heading", { name, exact: true }),
    });
    await expect(point).toContainText(address);
    await expect(point).toContainText("10:00–18:00");
    await expect(point).toContainText("Fechas por confirmar");
    await expect(point).not.toContainText(
      /Abierta ahora|Próxima apertura|2026-/,
    );
    await expect(point.getByRole("link")).toHaveAttribute(
      "href",
      "tel:+34600261620",
    );
  }
  await expect(
    page.getByRole("heading", { name: "Piroboom Elche", exact: true }),
  ).toBeVisible();
  const missing = await page.goto(publicationOrigin + fixturePath + query);
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "No encontramos lo que buscas.",
  );
  await expect(
    page.getByRole("link", { name: "Volver al catálogo", exact: true }),
  ).toHaveAttribute("href", "/catalogo-pdf/");
  for (const path of [
    "/media-demo/video/",
    "/media-demo/captions/",
    "/fixtures/catalog.json",
    "/catalogo-pdf/no-existe/",
    "/pagina-no-existe/",
  ]) {
    expect((await request.get(publicationOrigin + path + query)).status()).toBe(
      404,
    );
  }
  await page.goto(
    publicationOrigin + "/contacto/?motivo=producto&ref=FA-025&demo=1",
  );
  await expect(page.locator("#contact-productRef")).toHaveCount(0);
  await expect(
    page.getByText(/La referencia solicitada no está publicada/),
  ).toBeVisible();
});

test("T11 · proveedor ausente muestra alternativa y nunca confirma un envío", async ({
  page,
  request,
}) => {
  await page.goto(publicationOrigin + "/contacto/?motivo=visita");
  const form = page.getByRole("form", {
    name: "Consulta a Piroboom",
    exact: true,
  });
  await expect(
    form.getByRole("button", { name: "Enviar consulta", exact: true }),
  ).toBeDisabled();
  await expect(
    form.getByText(/El formulario todavía no está disponible/),
  ).toBeVisible();
  await expect(form.locator('a[href="tel:+34600261620"]')).toBeVisible();
  const response = await request.post(publicationOrigin + "/api/leads/", {
    headers: {
      Origin: publicationOrigin,
      "Idempotency-Key": randomUUID(),
      "Content-Type": "application/json",
    },
    data: {
      intention: "visit",
      name: "Prueba navegador",
      replyTo: "navegador@example.invalid",
      message: "Prueba navegador",
    },
  });
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const raw: unknown = await response.json();
  disabledResponseSchema.parse(raw);
  await expect(
    page.getByRole("heading", {
      name: /Consulta registrada|Prueba registrada localmente/,
    }),
  ).toHaveCount(0);
  await page.goto(publicationOrigin + "/eventos/#solicitud");
  await expect(
    page.getByRole("button", { name: "Enviar solicitud", exact: true }),
  ).toBeDisabled();
});

test("T15 · PDF real identificado y enlaces de llamada y ruta utilizables", async ({
  page,
  request,
}) => {
  const automaticPdfRequests: string[] = [];
  page.on("request", (incoming) => {
    if (new URL(incoming.url()).pathname === "/catalogos/catalogo-2026.pdf")
      automaticPdfRequests.push(incoming.url());
  });
  await page.goto(publicationOrigin + "/catalogo-pdf/");
  const pdf = page.getByRole("link", { name: /Descargar catálogo PDF/ });
  await pdf.hover();
  await page.waitForLoadState("networkidle");
  expect(automaticPdfRequests).toEqual([]);
  await expect(pdf).toHaveAttribute("href", "/catalogos/catalogo-2026.pdf");
  await expect(pdf).toHaveAttribute("target", "_blank");
  await expect(pdf).toHaveAttribute("rel", /noopener/);
  await expect(pdf).toHaveAccessibleName(/2026.*nueva pestaña/);
  await expect(
    page.getByText("81,9 MB · Documento del negocio", { exact: true }),
  ).toBeVisible();
  const pdfResponse = await request.head(
    publicationOrigin + "/catalogos/catalogo-2026.pdf",
  );
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toMatch(/application\/pdf/);
  expect(pdfResponse.headers()["content-length"]).toBe("81903612");
  // Unit tests hash the complete local document. HEAD checks public delivery
  // without downloading the 81.9 MB file again for every browser.
  await page.goto(publicationOrigin + "/tiendas/");
  const directions = page.getByRole("link", {
    name: "Abrir ruta en Google Maps, nueva pestaña",
    exact: true,
  });
  await expect(directions).toHaveAttribute(
    "href",
    "https://maps.app.goo.gl/C1XJNPujKvKTfNPH9",
  );
  await expect(directions).toHaveAttribute("target", "_blank");
  await expect(directions).toHaveAttribute("rel", /noopener/);
  await expect(
    page.getByRole("link", { name: "Llamar al 600 261 620", exact: true }),
  ).toHaveAttribute("href", "tel:+34600261620");
  await expect(page.getByRole("main")).toContainText("Calle Gloria Fuertes");
  await expect(page.getByRole("main")).toContainText(
    "festivos y excepciones pendientes de confirmación",
  );
});

test("T18,T19 · primera visita sin cookies, almacenamiento ni solicitudes a terceros", async ({
  page,
  context,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin !== publicationOrigin
    ) {
      externalRequests.push(url.origin + url.pathname);
    }
  });
  for (const path of ["/", "/eventos/", "/contacto/"]) {
    await page.goto(publicationOrigin + path, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
    await expect(page.locator("iframe")).toHaveCount(0);
  }
  expect(externalRequests).toEqual([]);
});
