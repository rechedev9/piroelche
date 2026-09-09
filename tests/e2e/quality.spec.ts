import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const paths = [
  "/",
  "/sobre-nosotros/",
  "/eventos/",
  "/tiendas/",
  "/catalogo-pdf/",
  "/contacto/",
  "/catalogo-pdf/fuegos-artificiales/",
  "/catalogo-pdf/fuegos-artificiales/bateria-25-disparos/",
];

test("WCAG automatic checks across all six sections, family, product and invalid form", async ({
  page,
}) => {
  for (const path of paths) {
    await page.goto(path);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations,
      `${path}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
  await page.goto("/contacto/");
  await page
    .getByRole("button", { name: "Enviar consulta", exact: true })
    .click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("responsive layouts, 200 percent equivalent reflow and long unbroken content", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const width of [320, 360, 390, 640, 768, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/contacto/?motivo=evento&ocasion=boda",
      "/catalogo-pdf/fuegos-artificiales/bateria-25-disparos/",
    ]) {
      await page.goto(path);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${width}px ${path}`,
      ).toBeLessThanOrEqual(width);
      if (path.includes("contacto")) {
        await page
          .getByRole("textbox", { name: /Tu nombre/ })
          .fill("N".repeat(80));
        await page
          .getByRole("textbox", { name: /Municipio o recinto/ })
          .fill("Recinto".repeat(25));
      } else {
        // Deliberate QA mutation, not a production fixture or visual baseline.
        await page.locator("h1").evaluate((el) => {
          el.textContent = "NombreIninterrumpido".repeat(10);
        });
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `long content ${width}px ${path}`,
      ).toBeLessThanOrEqual(width);
      const controls = page.locator(
        "main a.button:visible, main button:visible",
      );
      for (const control of await controls.all()) {
        const bounds = await control.boundingBox();
        expect(bounds).not.toBeNull();
        if (bounds) {
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
        }
      }
    }
  }
});

test("public pages have no external requests, optional trackers or cookies", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on("request", (req) => {
    if (!new URL(req.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(new URL(req.url()).origin);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of paths.slice(0, 6)) {
    await page.goto(`http://127.0.0.1:3001${path}`);
    // This test measures all requests. Let prefetch finish before destroying its document.
    await page.waitForLoadState("networkidle");
  }
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("keyboard mobile menu, Escape and reduced motion", async ({
  page,
  browserName,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const skipLink = page.getByRole("link", {
    name: "Saltar al contenido",
    exact: true,
  });
  const menu = page.getByRole("button", { name: "Menú", exact: true });
  const navigation = page.getByRole("navigation", {
    name: "Principal",
    exact: true,
  });
  const windowsWebKit =
    browserName === "webkit" && process.platform === "win32";
  await page.keyboard.press("Tab");
  if (windowsWebKit) {
    // Reproduced in Windows WebKit 26.6: Tab and Alt+Tab skip native links even
    // without application JS/CSS. Check that engine limitation before initializing
    // link focus; do not change the application's tab order to conceal it.
    await expect(menu).toBeFocused();
    const probe = await page.context().newPage();
    try {
      for (const key of ["Tab", "Alt+Tab"]) {
        await probe.setContent(
          '<a href="#target">First link</a><button>First control</button><input><div id="target" tabindex="-1">Target</div>',
        );
        await probe.keyboard.press(key);
        await expect(
          probe.getByRole("button", { name: "First control", exact: true }),
        ).toBeFocused();
      }
    } finally {
      await probe.close();
    }
    testInfo.annotations.push({
      type: "platform limitation",
      description:
        "Windows WebKit omits links from Tab and Alt+Tab even in plain HTML. Link focus is initialized explicitly; Enter activation, Shift+Tab, menu keyboard operation and Escape focus restoration remain tested. Link tab order is covered by Chromium and Firefox, not certified for native Safari here.",
    });
    await skipLink.focus();
  }
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(navigation).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cerrar", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).not.toBeVisible();
  await page.keyboard.press("Enter");
  await expect(navigation).toBeVisible();
  const shopsLink = navigation.getByRole("link", {
    name: "Tiendas",
    exact: true,
  });
  if (windowsWebKit) {
    await shopsLink.focus();
  } else {
    for (const name of ["Inicio", "Sobre nosotros", "Eventos", "Tiendas"]) {
      await page.keyboard.press("Tab");
      await expect(
        navigation.getByRole("link", { name, exact: true }),
      ).toBeFocused();
    }
  }
  await expect(shopsLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/tiendas\/$/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).not.toBeVisible();
});
