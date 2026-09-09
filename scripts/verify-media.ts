import { chromium, firefox, webkit, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
async function main() {
  const result = [];
  for (const engine of [chromium, firefox, webkit]) {
    const browser = await engine.launch();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.goto(
      "http://127.0.0.1:3000/catalogo-pdf/fuegos-artificiales/bateria-25-disparos/",
    );
    const video = page.locator("video");
    await video.scrollIntoViewIfNeeded();
    await video.evaluate(async (e: HTMLVideoElement) => {
      await e.play();
    });
    await expect
      .poll(() => video.evaluate((e: HTMLVideoElement) => e.currentTime))
      .toBeGreaterThan(0.2);
    await video.evaluate((e: HTMLVideoElement) => e.pause());
    const data = await video.evaluate((e: HTMLVideoElement) => {
      const c = document.createElement("canvas");
      c.width = 160;
      c.height = 90;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(e, 0, 0, 160, 90);
      const pixels = ctx.getImageData(0, 0, 160, 90).data;
      let light = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] > 170 && pixels[i + 1] > 170 && pixels[i + 2] > 170)
          light++;
      return {
        width: e.videoWidth,
        height: e.videoHeight,
        duration: e.duration,
        time: e.currentTime,
        light,
        error: e.error?.code,
        ready: e.readyState,
        css: e.getBoundingClientRect().width,
      };
    });
    await video.screenshot({
      path: `evidence/visual/video-${engine.name()}.png`,
    });
    result.push({ engine: engine.name(), version: browser.version(), ...data });
    await browser.close();
  }
  await writeFile(
    "evidence/media-decoding.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
