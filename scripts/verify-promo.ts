import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

async function main() {
  const browser = await chromium.launch();
  const observations: string[] = [];
  try {
    await mkdir("evidence/visual", { recursive: true });
    for (const width of [390, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      await page.goto("http://127.0.0.1:3000/");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Cerrar promoción" }),
      ).toBeFocused();
      for (let index = 0; index < 5; index += 1) {
        await page.keyboard.press("Tab");
        expect(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        ).toBe(true);
      }
      await page.screenshot({
        path: `evidence/visual/${width}-campaign-dialog.png`,
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(
        page.getByRole("link", { name: "Saltar al contenido" }),
      ).toBeFocused();
      await page.reload();
      await dialog.getByRole("button", { name: "Ahora no" }).click();
      await expect(dialog).not.toBeVisible();
      await page.reload();
      await dialog.getByRole("link", { name: "Ver casetas" }).click();
      await expect(page).toHaveURL(/\/tiendas\/#casetas$/);
      await expect(
        page.getByRole("heading", { name: "Casetas de temporada" }),
      ).toBeVisible();
      observations.push(
        `${width}px: active campaign opens; Tab stays within dialog; Escape restores focus to skip link when no trigger exists; dismiss and stores CTA work.`,
      );
      await page.close();
    }
    await writeFile(
      "evidence/promo.json",
      JSON.stringify(
        {
          browser: browser.version(),
          serverClock: "2026-12-20T10:00:00Z",
          configuration:
            "local review only; REVIEW_CAMPAIGNS=1; PIROBOOM_PROMO=1",
          observations,
        },
        null,
        2,
      ),
    );
    console.log("Campaña: 2 tamaños, foco, Escape, cierre y CTA verificados.");
  } finally {
    await browser.close();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
