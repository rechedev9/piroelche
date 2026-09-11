import { expect, test } from "@playwright/test";
import { publicationOrigin } from "./origins";

function canvasPixels(node: HTMLElement | SVGElement) {
  if (!(node instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
  return node.toDataURL();
}

test("fireworks load on demand, pause without redrawing and stop outside the viewport", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(publicationOrigin);
  const stage = page.locator(".brand-fireworks");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-playing", "true");
  await page.getByRole("button", { name: "Pausar animación" }).click();
  await expect(stage).toHaveAttribute("data-playing", "false");
  const canvas = stage.locator("canvas");
  const before = await canvas.evaluate(canvasPixels);
  await page.mouse.move(100, 100);
  // Observe several frames while paused; pointer input must not redraw the scene.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 0;
        function frame() {
          if (++frames === 5) resolve();
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  expect(await canvas.evaluate(canvasPixels)).toBe(before);
  await page.getByRole("button", { name: "Reanudar animación" }).click();
  await expect(stage).toHaveAttribute("data-playing", "true");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-playing", "false");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-playing", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(stage).toHaveAttribute("data-ready", "false");
  await expect(canvas).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(stage).toHaveAttribute("data-playing", "true");
});

test("reduced motion and failed animation resources preserve the static illustration", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(publicationOrigin);
  await page.waitForLoadState("networkidle");
  expect(
    requests.filter((url) => /hero-fireworks-(sky|atlas)/.test(url)),
  ).toEqual([]);
  await expect(page.locator(".brand-fireworks canvas")).toHaveCount(0);
  await page.route("**/hero-fireworks-atlas-v1.webp", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".brand-fireworks").scrollIntoViewIfNeeded();
  await expect
    .poll(() => requests.some((url) => url.includes("hero-fireworks-atlas")))
    .toBe(true);
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".brand-fireworks")).toHaveAttribute(
    "data-ready",
    "false",
  );
  await expect(page.locator(".brand-fireworks canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
