import { chromium, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const output = "evidence/visual";
const reference = "http://127.0.0.1:4174/Piroboom%20Prototipo.dc.html";
const demo = "http://127.0.0.1:3000";
const published = "http://127.0.0.1:3001";
const screens = [
  { id: "01-inicio", label: "Inicio", path: "/" },
  {
    id: "02-sobre-nosotros",
    label: "Sobre nosotros",
    path: "/sobre-nosotros/",
  },
  { id: "03-eventos", label: "Eventos", path: "/eventos/" },
  { id: "04-tiendas", label: "Tiendas", path: "/tiendas/" },
  { id: "05-catalogo", label: "Catálogo PDF", path: "/catalogo-pdf/" },
  { id: "06-contacto", label: "Contacto", path: "/contacto/" },
];
const evidence: {
  file: string;
  url: string;
  viewport: string;
  fonts: string;
  title: string;
  focusedElement: string | null;
}[] = [];
const errors: { url: string; message: string }[] = [];
async function capture(page: Page, file: string, viewport: string) {
  // Finish prefetch before leaving a document. Pending submission is captured
  // while its real response is deliberately held, so must not wait for idle.
  if (!file.includes("11-enviando")) await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Full-page capture otherwise composites fixed controls at the old scroll
    // offset. Keep focus intact and normalize only the document scroll position.
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: join(output, file),
    fullPage: true,
    animations: "disabled",
  });
  evidence.push({
    file,
    url: page.url(),
    viewport,
    fonts: await page.evaluate(() => document.fonts.status),
    title: await page.title(),
    focusedElement: await page.evaluate(
      () =>
        document.activeElement?.id || document.activeElement?.tagName || null,
    ),
  });
}
async function main() {
  const browser = await chromium.launch();
  try {
    await mkdir(output, { recursive: true });
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      const size = `${viewport.width}x${viewport.height}`;
      const context = await browser.newContext({
        viewport,
        reducedMotion: "reduce",
        locale: "es-ES",
        timezoneId: "Europe/Madrid",
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => {
        if (page.url().startsWith(demo) || page.url().startsWith(published))
          errors.push({ url: page.url(), message: error.message });
      });
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          (page.url().startsWith(demo) || page.url().startsWith(published))
        )
          errors.push({ url: page.url(), message: message.text() });
      });
      await page.clock.setFixedTime(new Date("2026-09-09T12:00:00Z"));
      for (const screen of screens) {
        await page.goto(reference);
        await page
          .getByRole("button", { name: screen.label, exact: true })
          .first()
          .click();
        await capture(page, `${size}-reference-${screen.id}.png`, size);
        await page.goto(`${demo}${screen.path}`);
        await capture(page, `${size}-demo-${screen.id}.png`, size);
        await page.goto(`${published}${screen.path}`);
        await capture(page, `${size}-public-${screen.id}.png`, size);
      }
      await page.goto(reference);
      await page
        .getByRole("button", { name: "Catálogo PDF", exact: true })
        .first()
        .click();
      await page.getByRole("button", { name: /Fuegos artificiales/ }).click();
      await capture(page, `${size}-reference-07-familia.png`, size);
      await page.getByRole("button", { name: /Batería 25 disparos/ }).click();
      await capture(page, `${size}-reference-08-ficha.png`, size);
      await page
        .getByRole("button", {
          name: "Consultar por este artículo",
          exact: true,
        })
        .click();
      await capture(page, `${size}-reference-09-referencia.png`, size);
      await page
        .getByRole("button", { name: "Enviar consulta", exact: true })
        .click();
      await capture(page, `${size}-reference-10-validacion.png`, size);
      await page.goto(`${demo}/catalogo-pdf/fuegos-artificiales/`);
      await capture(page, `${size}-demo-07-familia.png`, size);
      await page.getByRole("link", { name: /Batería 25 disparos/ }).click();
      await expect(page).toHaveURL(/\/bateria-25-disparos\/$/);
      await expect(page.locator("main h1")).toHaveText(
        "Batería 25 disparos (ejemplo)",
      );
      await capture(page, `${size}-demo-08-ficha.png`, size);
      await page
        .getByRole("link", { name: "Consultar por este artículo", exact: true })
        .click();
      await expect(page).toHaveURL(/\/contacto\/\?motivo=producto&ref=FA-025$/);
      await expect(page.locator("main h1")).toHaveText(
        "Cuéntanos qué necesitas",
      );
      await expect(
        page.getByRole("button", { name: "Quitar", exact: true }),
      ).toBeVisible();
      await capture(page, `${size}-demo-09-referencia.png`, size);
      await page
        .getByRole("button", { name: "Enviar consulta", exact: true })
        .click();
      await expect(
        page.getByText("Revisa los campos marcados. Tu mensaje se conserva.", {
          exact: true,
        }),
      ).toBeVisible();
      await capture(page, `${size}-demo-10-validacion.png`, size);
      await page
        .getByRole("textbox", { name: /Tu nombre/ })
        .fill("Prueba visual local");
      await page
        .getByRole("textbox", { name: /Cómo te respondemos/ })
        .fill("visual@example.invalid");
      await page
        .getByRole("textbox", { name: /Qué quieres saber/ })
        .fill("PRUEBA LOCAL de captura visual.");
      // Hold a real accepted response briefly to capture pending UI; never fabricate success.
      await page.route("**/api/leads/", async (route) => {
        const response = await route.fetch();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 800);
        });
        await route.fulfill({ response });
      });
      await page
        .getByRole("button", { name: "Enviar consulta", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Enviando…", exact: true }),
      ).toBeVisible();
      await capture(page, `${size}-demo-11-enviando.png`, size);
      await page
        .getByRole("heading", { name: "Prueba registrada localmente" })
        .waitFor();
      await capture(page, `${size}-demo-12-aceptada.png`, size);
      await page.unroute("**/api/leads/");
      await page.goto(`${published}/contacto/`);
      await capture(page, `${size}-public-13-sin-receptor.png`, size);
      await context.close();
    }
    await writeFile(
      join(output, "captures.json"),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          browser: browser.version(),
          clientClock: "2026-09-09T12:00:00Z",
          serverClock:
            process.env.REVIEW_NOW || "real; no clock override in production",
          motion: "reduce; screenshot animations disabled",
          captures: evidence,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
    console.log(`${evidence.length} capturas guardadas en ${output}.`);
  } finally {
    await browser.close();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
