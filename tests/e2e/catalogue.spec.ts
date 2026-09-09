import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const origin = "http://127.0.0.1:3001";

test("the 16-page catalogue is navigable without automatically downloading the PDF", async ({
  page,
}) => {
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
    await expect(image).toHaveAttribute(
      "src",
      `/media/catalogo-2026/page-${String(number).padStart(2, "0")}.webp`,
    );
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth === 1600,
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
      "/media/catalogo-2026/page-09.webp",
    );
    await page
      .getByText("Leer el texto de esta página", { exact: true })
      .click();
    await expect(page.locator(".catalogue-page-text pre")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("catalogue layout keeps page controls usable on mobile, laptop and desktop with long titles", async ({
  page,
}) => {
  for (const width of [390, 1366, 1920]) {
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
