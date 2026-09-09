import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";

async function main() {
  const { default: lighthouse } = await import("lighthouse");
  const { default: desktop } =
    await import("lighthouse/core/config/desktop-config.js");
  const browser = await chromium.launch({
    args: ["--remote-debugging-port=9222"],
  });
  const rows = [];
  try {
    await mkdir("evidence/performance", { recursive: true });
    for (const profile of ["mobile", "desktop"]) {
      for (const [name, path] of [
        ["inicio", "/"],
        ["catalogo", "/catalogo-pdf/"],
        ["contacto", "/contacto/"],
      ]) {
        const result = await lighthouse(
          `http://127.0.0.1:3001${path}`,
          {
            port: 9222,
            logLevel: "error",
            output: "html",
            onlyCategories: [
              "performance",
              "accessibility",
              "best-practices",
              "seo",
            ],
          },
          profile === "desktop" ? desktop : undefined,
        );
        if (!result || result.lhr.runtimeError)
          throw new Error(
            `Lighthouse no completó ${name}/${profile}: ${result?.lhr.runtimeError?.code || "sin resultado"}`,
          );
        const id = `${name}-${profile}`;
        await writeFile(
          `evidence/performance/${id}.json`,
          JSON.stringify(result.lhr, null, 2),
        );
        await writeFile(
          `evidence/performance/${id}.html`,
          (Array.isArray(result.report)
            ? result.report.join("\n")
            : result.report
          ).replace(/[\t ]+$/gm, ""),
        );
        const metrics = {
          lcpMs: result.lhr.audits["largest-contentful-paint"].numericValue,
          cls: result.lhr.audits["cumulative-layout-shift"].numericValue,
          tbtMs: result.lhr.audits["total-blocking-time"].numericValue,
        };
        const row = {
          page: name,
          profile,
          scores: Object.fromEntries(
            Object.entries(result.lhr.categories).map(([key, value]) => [
              key,
              value.score,
            ]),
          ),
          ...metrics,
          lighthouseVersion: result.lhr.lighthouseVersion,
          settings: result.lhr.configSettings,
        };
        rows.push(row);
        console.log(
          JSON.stringify({
            page: name,
            profile,
            ...metrics,
            scores: row.scores,
          }),
        );
      }
    }
    await writeFile(
      "evidence/performance/summary.json",
      JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          browser: browser.version(),
          node: process.version,
          os: `${platform()} ${release()}`,
          cpu: cpus()[0]?.model,
          build:
            "Next production; public content; localhost; no optional third parties",
          caveat:
            "Single lab run per page/profile; not field data, not INP and not a p75 sample. Localhost omits WAN/server latency.",
          results: rows,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
