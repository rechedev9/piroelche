import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

import { publicationOrigin as origin } from "./origins";

test("the 16-page catalogue is navigable without automatically downloading the PDF", async ({
  page,
}) => {
  // Each page is resized on first request per width and format, so a cold
  // optimizer cache on CI needs more than the default budget across 16 pages.
  test.setTimeout(90_000);
  const pdfRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith(".pdf"))
      pdfRequests.push(request.url());
  });
  await page.goto(origin + "/catalogo-pdf/?pagina=1#lector");
  await expect(
    page
      .getByRole("navigation", { name: "Páginas del catálogo" })
      .getByRole("link"),
  ).toHaveCount(16);
  for (let number = 1; number <= 16; number++) {
    const image = page.locator(".catalogue-sheet");
    // The reader goes through the image optimizer, so match the source file
    // inside the encoded URL rather than a literal path.
    await expect(image).toHaveAttribute(
      "src",
      new RegExp(`page-${String(number).padStart(2, "0")}\\.webp`),
    );
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(
      page.locator('.catalogue-index a[aria-current="page"]'),
    ).toHaveAttribute("href", `/catalogo-pdf/?pagina=${number}#lector`);
    if (number < 16)
      await page
        .getByRole("link", {
          name: `Página siguiente, ${number + 1}`,
          exact: true,
        })
        .click();
  }
  await expect(
    page.getByRole("button", { name: "Siguiente", exact: true }),
  ).toBeDisabled();
  expect(pdfRequests).toEqual([]);
  await page.reload();
  await expect(page.locator(".catalogue-pagination")).toContainText("16");
});

test("catalogue zoom is keyboard accessible and family pages lead to the matching section", async ({
  page,
}) => {
  await page.goto(origin + "/catalogo-pdf/fuego-frio/");
  await expect(page.locator("main .media-note")).toHaveCount(0);
  await page.locator(".family-page-card").click();
  await expect(page).toHaveURL(/pagina=13#lector$/);
  const enlarge = page.getByRole("link", { name: /^Ampliar página 13:/ });
  await enlarge.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const fittedImage = await dialog.locator("img").boundingBox();
  const fittedRegion = await dialog
    .locator(".catalogue-zoom-scroll")
    .boundingBox();
  expect(fittedImage).not.toBeNull();
  expect(fittedRegion).not.toBeNull();
  if (fittedImage && fittedRegion) {
    expect(fittedImage.height).toBeLessThanOrEqual(fittedRegion.height);
    expect(fittedImage.width).toBeLessThanOrEqual(fittedRegion.width);
  }
  await dialog.getByRole("button", { name: "Ajustar al ancho" }).click();
  await dialog.getByRole("button", { name: "Aumentar ampliación" }).click();
  await expect(dialog.locator("output")).toHaveText("1.5×");
  expect(
    await dialog
      .locator(".catalogue-zoom-scroll")
      .evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  const scrollRegion = dialog.getByRole("region", { name: "Página ampliada" });
  await scrollRegion.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => scrollRegion.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(enlarge).toBeFocused();
  await page.getByText("Leer el texto de esta página", { exact: true }).click();
  await expect(page.locator(".catalogue-page-text pre")).toBeVisible();
  await expect(page.locator(".catalogue-page-text pre")).toContainText("FRIO");
});

test("catalogue page navigation and readable text work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(origin + "/catalogo-pdf/?pagina=8#lector");
    await expect(page.locator(".catalogue-current-title")).toHaveText("TRACAS");
    await page
      .getByRole("link", { name: "Página siguiente, 9", exact: true })
      .click();
    await expect(page).toHaveURL(/pagina=9#lector$/);
    await expect(page.locator(".catalogue-sheet")).toHaveAttribute(
      "src",
      /page-09\.webp/,
    );
    await page
      .getByText("Leer el texto de esta página", { exact: true })
      .click();
    await expect(page.locator(".catalogue-page-text pre")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Ir a la página" })
      .selectOption("12");
    await page.getByRole("button", { name: "Ir", exact: true }).click();
    await expect(page).toHaveURL(/pagina=12#lector$/);
    await expect(page.locator(".catalogue-sheet")).toHaveAttribute(
      "src",
      /page-12\.webp/,
    );
  } finally {
    await context.close();
  }
});

test("catalogue layout keeps page controls usable on mobile, laptop and desktop with long titles", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + "/catalogo-pdf/?pagina=12#lector");
    await page.locator(".catalogue-current-title").evaluate((element) => {
      element.textContent = "NombreLargoDeSeccion".repeat(12);
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    for (const control of await page
      .locator(".catalogue-pagination a, .catalogue-pagination button")
      .all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
  }
});

test("catalogue search finds article text without accents and recovers from empty results", async ({
  page,
}) => {
  await page.goto(origin + "/catalogo-pdf/#lector");
  const search = page.getByRole("searchbox", { name: "Buscar en el catálogo" });
  const index = page.getByRole("navigation", { name: "Páginas del catálogo" });
  await search.fill("MiSiL titan");
  await expect(index.getByRole("link")).toHaveCount(1);
  await expect(index).toContainText("EFECTO VOLADOR");
  await index.getByRole("link").click();
  await expect(page).toHaveURL(/pagina=5#lector$/);
  await expect(search).toHaveValue("MiSiL titan");
  await search.fill("no-such-article");
  await expect(index.getByRole("link")).toHaveCount(0);
  await expect(page.getByText("0 páginas encontradas")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(index.getByRole("link")).toHaveCount(16);
  await expect(search).toBeFocused();
  await page
    .getByRole("combobox", { name: "Ir a la página" })
    .selectOption("16");
  await expect(page).toHaveURL(/pagina=16#lector$/);
  await expect(index.locator('[aria-current="page"]')).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/pagina=5#lector$/);
  await expect(
    page.getByRole("combobox", { name: "Ir a la página" }),
  ).toHaveValue("5");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  }
});

test("mobile catalogue index collapses after selection and zoom navigation stays open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/catalogo-pdf/#lector");
  const index = page.locator(".catalogue-index");
  await expect(index).not.toHaveAttribute("open", "");
  await index.locator("summary").click();
  await page
    .getByRole("searchbox", { name: "Buscar en el catálogo" })
    .fill("fuego frio");
  await index.getByRole("link").click();
  await expect(page).toHaveURL(/pagina=13#lector$/);
  await expect(index).not.toHaveAttribute("open", "");
  await page.getByRole("link", { name: /^Ampliar página 13:/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("link", { name: "Página siguiente, 14", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toContainText("Página 14:");
  await expect(page).toHaveURL(/pagina=14#lector$/);
  await dialog
    .getByRole("combobox", { name: "Ir a la página" })
    .selectOption("16");
  await expect(dialog.getByRole("heading")).toContainText("Página 16:");
  await expect(
    dialog.getByRole("button", { name: "Siguiente", exact: true }),
  ).toBeDisabled();
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    for (const control of await dialog.locator("button, a, select").all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /^Ampliar página 16:/ }),
  ).toBeFocused();
  await page
    .getByRole("navigation", { name: "Accesos rápidos del catálogo" })
    .getByRole("link", { name: "Humo de color" })
    .click();
  await expect(page).toHaveURL(/pagina=12#lector$/);
});
