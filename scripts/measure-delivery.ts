import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

// Compare production builds with fresh browser contexts and reduced motion so
// optional animation and prefetch timing do not distort initial document costs.
async function main() {
  const origin = process.argv[2] || "http://127.0.0.1:3001";
  const output = process.argv[3];
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const path of ["/", "/catalogo-pdf/", "/contacto/", "/eventos/"]) {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        const response = await page.goto(origin + path);
        if (!response?.ok()) throw new Error(`Cannot load ${path}`);
        await page.waitForLoadState("networkidle");
        const html = await response.body();
        const scripts = await page
          .locator("script[src]")
          .evaluateAll((nodes) =>
            nodes.flatMap((node) =>
              node instanceof HTMLScriptElement ? [node.src] : [],
            ),
          );
        let javascriptBytes = 0;
        let javascriptGzipBytes = 0;
        for (const src of new Set(scripts)) {
          const script = await context.request.get(src);
          if (!script.ok()) throw new Error(`Cannot load ${src}`);
          const bytes = await script.body();
          javascriptBytes += bytes.length;
          javascriptGzipBytes += gzipSync(bytes).length;
        }
        results.push({
          path,
          htmlBytes: html.length,
          htmlGzipBytes: gzipSync(html).length,
          javascriptBytes,
          javascriptGzipBytes,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const report =
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        origin,
        note: "Initial document and its script tags; fresh context, reduced motion. Gzip computed locally; excludes lazy chunks and does not measure user latency.",
        results,
      },
      null,
      2,
    ) + "\n";
  if (output) await writeFile(output, report);
  console.log(report);
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
