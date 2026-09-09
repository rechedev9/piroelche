import { randomUUID } from "node:crypto";
import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { z } from "zod";

const demoOrigin = "http://127.0.0.1:3000";
const familyPath = "/catalogo-pdf/fuegos-artificiales/";
const productPath = familyPath + "bateria-25-disparos/";
const testName = "Prueba navegador";
const testEmail = "navegador@example.invalid";
const routes = [
  {
    path: "/",
    label: "Inicio",
    h1: "Pirotecnia para tus celebraciones en Elche.",
  },
  {
    path: "/sobre-nosotros/",
    label: "Sobre nosotros",
    h1: "Una tienda de pirotecnia en Elche para tus celebraciones.",
  },
  {
    path: "/eventos/",
    label: "Eventos",
    h1: "Cuéntanos qué celebras. Nosotros te decimos qué encaja.",
  },
  { path: "/tiendas/", label: "Tiendas", h1: "Dónde comprar" },
  { path: "/catalogo-pdf/", label: "Catálogo PDF", h1: "Catálogo" },
  { path: "/contacto/", label: "Contacto", h1: "Cuéntanos qué necesitas" },
  {
    path: "/politica-de-privacidad/",
    label: "Política de privacidad",
    h1: "Política de privacidad",
  },
  {
    path: "/politica-de-cookies/",
    label: "Cookies",
    h1: "Política de cookies",
  },
  { path: "/aviso-legal/", label: "Aviso legal", h1: "Aviso legal" },
];
const receiptSchema = z
  .object({
    ok: z.literal(true),
    status: z.literal("recorded"),
    id: z.string().regex(/^PB-[A-F0-9]{24}$/),
    receivedAt: z.iso.datetime({ precision: 3 }),
    replayed: z.boolean(),
    mode: z.literal("local-test"),
  })
  .strict();
const errorSchema = z
  .object({
    ok: z.literal(false),
    code: z.string(),
    message: z.string().min(1),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  })
  .strict();
const objectSchema = z.record(z.string(), z.unknown());

async function expectHeading(page: Page, heading: string) {
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
}

async function expectApiError(
  response: APIResponse,
  status: number,
  code: string,
) {
  expect(response.status()).toBe(status);
  const payload: unknown = await response.json();
  const result = errorSchema.parse(payload);
  expect(result.code).toBe(code);
  expect(response.headers()["cache-control"]).toContain("no-store");
}

function apiHeaders() {
  return {
    Origin: demoOrigin,
    "Content-Type": "application/json",
    "Idempotency-Key": randomUUID(),
  };
}

for (const route of routes) {
  test("T01 · acceso directo y recarga: " + route.label, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expectHeading(page, route.h1);
    expect((await page.reload())?.status()).toBe(200);
    await expectHeading(page, route.h1);
    await expect(page.getByRole("note")).toContainText("Demostración local");
  });
}

test("T01 · las nueve páginas entregan contenido y alternativas sin JavaScript", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: demoOrigin,
  });
  try {
    const page = await context.newPage();
    for (const route of routes) {
      expect((await page.goto(route.path))?.status()).toBe(200);
      await expectHeading(page, route.h1);
      await expect(
        page
          .getByRole("navigation", { name: "Secciones del pie" })
          .getByRole("link"),
      ).toHaveCount(6);
      await expect(
        page
          .getByRole("navigation", { name: "Información legal" })
          .getByRole("link"),
      ).toHaveCount(3);
      await expect(
        page.locator('a[href="tel:+34600261620"]').first(),
      ).toBeVisible();
    }
    await page.goto("/contacto/");
    await expect(
      page.getByRole("button", { name: "Enviar consulta", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("link", { name: "Llamar al 600 261 620", exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("T02 · navegación completa en escritorio y menú móvil con Escape y foco", async ({
  page,
}) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "Principal",
    exact: true,
  });
  for (const route of routes.slice(0, 6)) {
    const link = navigation.getByRole("link", {
      name: route.label,
      exact: true,
    });
    await expect(link).toHaveAttribute("href", route.path);
    await link.click();
    await expectHeading(page, route.h1);
    await expect(link).toHaveAttribute("aria-current", "page");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByRole("button", { name: "Menú", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  const close = page.getByRole("button", { name: "Cerrar", exact: true });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  await navigation.getByRole("link", { name: "Inicio", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  for (const route of routes.slice(0, 6)) {
    await toggle.click();
    await navigation
      .getByRole("link", { name: route.label, exact: true })
      .click();
    await expectHeading(page, route.h1);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
});

test("T03–T05 · intenciones de Inicio, familias distintas, ficha y regreso", async ({
  page,
}) => {
  await page.goto("/");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("link", { name: "Explorar catálogo", exact: true }),
  ).toHaveAttribute("href", "/catalogo-pdf/");
  await expect(
    main.getByRole("link", { name: "Planificar mi evento", exact: true }),
  ).toHaveAttribute("href", "/eventos/");
  await main
    .getByRole("link", { name: "Explorar catálogo", exact: true })
    .click();
  const families = main.locator(".catalog-families a");
  await expect(families).toHaveCount(4);
  expect(
    await families.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual([
    "/catalogo-pdf/fuegos-artificiales/",
    "/catalogo-pdf/humo-de-color/",
    "/catalogo-pdf/fuego-frio/",
    "/catalogo-pdf/tracas-y-otros/",
  ]);
  await families.filter({ hasText: "Fuegos artificiales" }).click();
  await expectHeading(page, "Fuegos artificiales");
  await main.getByRole("link", { name: /FA-025/ }).click();
  await expectHeading(page, "Batería 25 disparos (ejemplo)");
  await expect(main).toContainText("Clasificación y condiciones");
  await expect(main).toContainText("Consultar en tienda");
  await expect(main).toContainText(
    "Aparecer en el catálogo no garantiza stock",
  );
  await page.goBack();
  await expect(page).toHaveURL(demoOrigin + familyPath);
  await expect(main.getByRole("link", { name: /FA-025/ })).toBeVisible();
  await main.getByRole("link", { name: /FA-025/ }).click();
  await main
    .getByRole("link", { name: "Consultar por este artículo", exact: true })
    .click();
  await expect(page).toHaveURL(
    demoOrigin + "/contacto/?motivo=producto&ref=FA-025",
  );
  await expect(page.locator("#contact-productRef")).toContainText("FA-025");
  await page.reload();
  await expect(page.locator("#contact-productRef")).toContainText(
    "Batería 25 disparos",
  );
  await expect(
    page.getByRole("button", { name: "Enviar consulta", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Tu nombre", { exact: true }).fill(testName);
  await page.getByLabel("Cómo te respondemos", { exact: true }).fill(testEmail);
  await page.getByRole("button", { name: "Quitar", exact: true }).click();
  await expect(page).toHaveURL(demoOrigin + "/contacto/?motivo=producto");
  await expect(page.locator("#contact-productRef")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#contact-productRef")).toHaveCount(0);
  await expect(page.getByLabel("Tu nombre", { exact: true })).toHaveValue(
    testName,
  );
  await expect(
    page.getByLabel("Cómo te respondemos", { exact: true }),
  ).toHaveValue(testEmail);
});

test("T06,T18 · cambiar de motivo elimina referencia y datos del motivo anterior", async ({
  page,
}) => {
  await page.goto("/contacto/?motivo=producto&ref=FA-025");
  await expect(
    page.getByRole("button", { name: "Enviar consulta", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Tu nombre", { exact: true }).fill(testName);
  await page.getByLabel("Cómo te respondemos", { exact: true }).fill(testEmail);
  await page
    .getByLabel("Qué quieres saber (opcional)", { exact: true })
    .fill(testName);
  await page.getByRole("radio", { name: "Evento", exact: true }).check();
  await expect(page).toHaveURL(demoOrigin + "/contacto/?motivo=evento");
  await expect(
    page.getByLabel("Detalles del evento (opcional)", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Ocasión", exact: true })
    .selectOption("boda");
  await page.getByLabel("Por definir", { exact: true }).check();
  await page
    .getByLabel("Municipio o recinto (si lo sabes)", { exact: true })
    .fill(testName);
  await page
    .getByLabel("Detalles del evento (opcional)", { exact: true })
    .fill(testName);
  await page
    .getByRole("radio", { name: "Visita / otras", exact: true })
    .check();
  await expect(page).toHaveURL(demoOrigin + "/contacto/?motivo=visita");
  await expect(page.getByLabel("Tu consulta", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Ocasión", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Tu consulta", { exact: true }).fill(testName);
  // This request is deliberately stopped before the server; it tests serialization,
  // while the receipt tests below use the real receiver without mocked successes.
  await page.route("**/api/leads/", async (route) => {
    await route.abort("failed");
  });
  const outgoing = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/leads/") && request.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Enviar consulta", exact: true })
    .click();
  const request = await outgoing;
  const payload: unknown = request.postDataJSON();
  expect(objectSchema.parse(payload)).toEqual({
    intention: "visit",
    name: testName,
    replyTo: testEmail,
    message: testName,
    website: "",
  });
  await expect(
    page
      .getByRole("form", { name: "Consulta a Piroboom", exact: true })
      .getByRole("alert"),
  ).toContainText("Tu consulta se conserva");
  expect(decodeURIComponent(page.url())).not.toMatch(
    /Prueba navegador|example\.invalid/,
  );
});

test("T07,T09 · evento con fecha por definir, sin nombre ni lugar y un solo correo", async ({
  page,
}) => {
  await page.goto("/eventos/?ocasion=boda#solicitud");
  const form = page.getByRole("form", {
    name: "Solicitud de evento",
    exact: true,
  });
  await expect(
    form.getByRole("button", { name: "Enviar solicitud", exact: true }),
  ).toBeEnabled();
  await expect(
    form.getByRole("combobox", { name: "Ocasión", exact: true }),
  ).toHaveValue("boda");
  await expect(form.locator('input[name="name"]')).toHaveCount(0);
  await form.getByLabel("Por definir", { exact: true }).check();
  await expect(form.getByLabel("Fecha", { exact: true })).toBeDisabled();
  await form.getByLabel("Cómo te respondemos", { exact: true }).fill(testEmail);
  const received = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/leads/") &&
      response.request().method() === "POST",
  );
  await form
    .getByRole("button", { name: "Enviar solicitud", exact: true })
    .click();
  const response = await received;
  expect(response.status()).toBe(201);
  const raw: unknown = await response.json();
  const receipt = receiptSchema.parse(raw);
  expect(receipt.replayed).toBe(false);
  const rawRequest: unknown = response.request().postDataJSON();
  const payload = objectSchema.parse(rawRequest);
  expect(payload).toMatchObject({
    intention: "event",
    occasion: "boda",
    dateUndecided: true,
    replyTo: testEmail,
  });
  for (const field of ["name", "date", "productRef"])
    expect(payload).not.toHaveProperty(field);
  expect(payload.location).toBe("");
  const confirmation = page.getByRole("region", {
    name: "Prueba registrada localmente",
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(receipt.id);
  await expect(confirmation).toContainText(
    "No se ha enviado ningún mensaje al negocio",
  );
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute("aria-live", "polite");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("piroboom.event.draft.v1"),
    ),
  ).toBeNull();
});

test("T08,T20 · errores accesibles, foco y datos conservados antes de enviar", async ({
  page,
}) => {
  await page.goto("/contacto/?motivo=visita");
  let submissions = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/leads/") && request.method() === "POST")
      submissions += 1;
  });
  const form = page.getByRole("form", {
    name: "Consulta a Piroboom",
    exact: true,
  });
  await form
    .getByRole("button", { name: "Enviar consulta", exact: true })
    .click();
  const alert = form.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toBeFocused();
  await expect(alert.getByRole("link")).toHaveCount(2);
  await expect(
    form.getByRole("textbox", { name: /^Tu nombre/ }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    form.getByRole("textbox", { name: /^Cómo te respondemos/ }),
  ).toHaveAttribute("aria-describedby", "contact-replyTo-error");
  await alert.getByRole("link", { name: /^Tu nombre:/ }).click();
  await expect(form.getByRole("textbox", { name: /^Tu nombre/ })).toBeFocused();
  await form.getByRole("textbox", { name: /^Tu nombre/ }).fill(testName);
  await form
    .getByRole("textbox", { name: /^Cómo te respondemos/ })
    .fill("Prueba navegador");
  await form.getByLabel("Tu consulta", { exact: true }).fill(testName);
  await form
    .getByRole("button", { name: "Enviar consulta", exact: true })
    .click();
  await expect(alert).toBeFocused();
  await expect(alert).toContainText(
    "Escribe un correo electrónico o teléfono válido",
  );
  await expect(form.getByLabel("Tu nombre", { exact: true })).toHaveValue(
    testName,
  );
  await expect(
    form.getByRole("textbox", { name: "Tu consulta", exact: true }),
  ).toHaveValue(testName);
  expect(submissions).toBe(0);
});

test("T09–T11,T18 · doble clic, respuesta perdida, recarga y reintento recuperan el mismo registro real", async ({
  page,
  request,
}) => {
  const requestUrls: string[] = [];
  page.on("request", (outgoing) => {
    requestUrls.push(outgoing.url());
  });
  await page.goto("/contacto/?motivo=visita");
  await expect(
    page.getByRole("button", { name: "Enviar consulta", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Tu nombre", { exact: true }).fill(testName);
  await page.getByLabel("Cómo te respondemos", { exact: true }).fill(testEmail);
  await page.getByLabel("Tu consulta", { exact: true }).fill(testName);
  const accepted: z.infer<typeof receiptSchema>[] = [];
  const sentKeys: string[] = [];
  const sentBodies: Record<string, unknown>[] = [];
  const upstreamStatuses: number[] = [];
  await page.route("**/api/leads/", async (route) => {
    const outgoing = route.request();
    sentKeys.push(z.uuid().parse(outgoing.headers()["idempotency-key"]));
    const rawBody: unknown = outgoing.postDataJSON();
    sentBodies.push(objectSchema.parse(rawBody));
    // Persist through the actual HTTP endpoint, then lose only its response.
    // No success status or receipt is manufactured by this test.
    const upstream = await route.fetch();
    upstreamStatuses.push(upstream.status());
    const raw: unknown = await upstream.json();
    accepted.push(receiptSchema.parse(raw));
    await route.abort("failed");
  });
  await page
    .getByRole("button", { name: "Enviar consulta", exact: true })
    .dblclick();
  await expect(
    page
      .getByRole("form", { name: "Consulta a Piroboom", exact: true })
      .getByRole("alert"),
  ).toContainText("Tu consulta se conserva");
  expect(upstreamStatuses).toEqual([201]);
  expect(sentKeys).toHaveLength(1);
  const firstReceipt = receiptSchema.parse(accepted[0]);
  expect(firstReceipt.replayed).toBe(false);
  const key = z.uuid().parse(sentKeys[0]);
  const body = objectSchema.parse(sentBodies[0]);
  await page.unroute("**/api/leads/");
  await page.reload();
  await expect(page.getByLabel("Tu nombre", { exact: true })).toHaveValue(
    testName,
  );
  await expect(
    page.getByLabel("Cómo te respondemos", { exact: true }),
  ).toHaveValue(testEmail);
  await expect(
    page.getByRole("textbox", { name: "Tu consulta", exact: true }),
  ).toHaveValue(testName);
  const retried = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/leads/") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Enviar consulta", exact: true })
    .click();
  const retryResponse = await retried;
  expect(retryResponse.status()).toBe(200);
  expect(retryResponse.request().headers()["idempotency-key"]).toBe(key);
  const retryRaw: unknown = await retryResponse.json();
  expect(receiptSchema.parse(retryRaw)).toEqual({
    ...firstReceipt,
    replayed: true,
  });
  const confirmation = page.getByRole("region", {
    name: "Prueba registrada localmente",
    exact: true,
  });
  await expect(confirmation).toContainText(firstReceipt.id);
  await expect(confirmation).toContainText("sin crear otra consulta");
  await expect(confirmation).toBeFocused();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("piroboom.contact.draft.v1"),
    ),
  ).toBeNull();

  const replay = await request.post("/api/leads/", {
    headers: { ...apiHeaders(), "Idempotency-Key": key },
    data: body,
  });
  expect(replay.status()).toBe(200);
  const replayRaw: unknown = await replay.json();
  expect(receiptSchema.parse(replayRaw)).toEqual({
    ...firstReceipt,
    replayed: true,
  });
  const conflict = await request.post("/api/leads/", {
    headers: { ...apiHeaders(), "Idempotency-Key": key },
    data: { ...body, message: "Prueba navegador Prueba navegador" },
  });
  await expectApiError(conflict, 409, "idempotency_conflict");
  for (const url of requestUrls) {
    expect(decodeURIComponent(url)).not.toMatch(
      /Prueba navegador|example\.invalid|PB-[A-F0-9]{24}/,
    );
  }
});

test("T08,T11 · el endpoint rechaza origen, formato, tamaño y referencias manipuladas", async ({
  request,
}) => {
  const validBody = {
    intention: "visit",
    name: testName,
    replyTo: testEmail,
    message: testName,
  };
  await expectApiError(
    await request.post("/api/leads/", {
      headers: { "Idempotency-Key": randomUUID() },
      data: validBody,
    }),
    403,
    "forbidden",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: { ...apiHeaders(), Origin: "https://example.invalid" },
      data: validBody,
    }),
    403,
    "forbidden",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: { ...apiHeaders(), "Sec-Fetch-Site": "cross-site" },
      data: validBody,
    }),
    403,
    "forbidden",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: { ...apiHeaders(), "Content-Type": "text/plain" },
      data: JSON.stringify(validBody),
    }),
    415,
    "invalid_request",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: apiHeaders(),
      data: Buffer.from("{"),
    }),
    400,
    "invalid_request",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: { Origin: demoOrigin },
      data: validBody,
    }),
    400,
    "invalid_request",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: apiHeaders(),
      data: { ...validBody, message: testName.repeat(1200) },
    }),
    413,
    "invalid_request",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: apiHeaders(),
      data: { ...validBody, intention: "product", productRef: "NO-EXISTE" },
    }),
    422,
    "validation_failed",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: apiHeaders(),
      data: { ...validBody, productRef: "FA-025" },
    }),
    422,
    "validation_failed",
  );
  await expectApiError(
    await request.post("/api/leads/", {
      headers: apiHeaders(),
      data: { ...validBody, website: "https://example.invalid" },
    }),
    422,
    "validation_failed",
  );
  expect((await request.get("/api/leads/")).status()).toBe(405);
});

test("T16,T20 · vídeo voluntario y degradación real al fallar el recurso", async ({
  page,
  request,
  browserName,
}) => {
  const videoRequests: string[] = [];
  page.on("request", (resourceRequest) => {
    if (new URL(resourceRequest.url()).pathname === "/media-demo/video/")
      videoRequests.push(resourceRequest.url());
  });
  await page.goto(productPath);
  const video = page.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  expect(await video.getAttribute("autoplay")).toBeNull();
  expect(
    await video.evaluate(
      (element) =>
        element instanceof HTMLVideoElement &&
        element.paused &&
        element.muted &&
        element.controls,
    ),
  ).toBe(true);
  expect(videoRequests).toHaveLength(0);
  // preload is a browser hint; native WebKit may buffer data, but must remain paused.
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.currentTime),
  ).toBe(0);
  await video.evaluate(async (element) => {
    if (!(element instanceof HTMLVideoElement))
      throw new Error("Falta el vídeo de demostración.");
    await element.play();
  });
  await expect
    .poll(() =>
      video.evaluate(
        (element) => element instanceof HTMLVideoElement && element.currentTime,
      ),
    )
    .toBeGreaterThan(0);
  // Windows Media Foundation loads outside Playwright interception and exposes
  // its scaled output size through videoWidth. Verify decoded pixels as well as
  // duration; advancing currentTime alone does not prove a visible frame.
  if (!(browserName === "webkit" && process.platform === "win32")) {
    expect(videoRequests.length).toBeGreaterThan(0);
    expect(
      await video.evaluate((element: HTMLVideoElement) => element.videoWidth),
    ).toBe(640);
  }
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.duration),
  ).toBe(2);
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No se puede inspeccionar el fotograma.");
        context.drawImage(element, 0, 0, 160, 90);
        const pixels = context.getImageData(0, 0, 160, 90).data;
        let lightPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            pixels[index] > 170 &&
            pixels[index + 1] > 170 &&
            pixels[index + 2] > 170
          )
            lightPixels++;
        }
        return lightPixels;
      }),
    )
    .toBeGreaterThan(20);
  await video.evaluate((element) => {
    if (element instanceof HTMLVideoElement) element.pause();
  });
  // Use a genuinely absent resource: Firefox can reuse a decoded video after reload,
  // and WebKit's native loader bypasses route interception. No fake error event.
  const missingPath = `/qa-missing-${randomUUID()}.mp4`;
  expect((await request.get(missingPath)).status()).toBe(404);
  await page.locator("video").evaluate((element, path) => {
    if (!(element instanceof HTMLVideoElement))
      throw new Error("Falta el vídeo de demostración.");
    element.src = path;
    element.load();
    // Rejection is the intended network failure; the visible fallback is asserted.
    void element.play().catch(() => {});
  }, missingPath);
  await expect(
    page.getByText("No se ha podido cargar el vídeo.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Consultar por este artículo",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(familyPath + "bateria-100-disparos/");
  await expect(
    page.getByText("Vídeo del efecto no disponible para esta referencia.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Consultar por este artículo",
      exact: true,
    }),
  ).toBeVisible();
});
