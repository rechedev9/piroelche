import { defineConfig, devices } from "@playwright/test";
import {
  demoOrigin,
  demoPort,
  publicationOrigin,
  publicationPort,
} from "./tests/e2e/origins";

const reuseExistingServer =
  process.env.E2E_REUSE_SERVERS === "1" && !process.env.CI;
const reportDirectory = process.env.E2E_REPORT_DIR;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: reportDirectory ? `${reportDirectory}/artifacts` : "test-results",
  // Lets CI shard by test rather than by file. One worker: the suite is
  // CPU-bound and a second one on a 2-vCPU runner only adds timeouts.
  fullyParallel: true,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: reportDirectory
          ? `${reportDirectory}/results.json`
          : "evidence/playwright-results.json",
      },
    ],
    [
      "html",
      {
        open: "never",
        ...(reportDirectory ? { outputFolder: `${reportDirectory}/html` } : {}),
      },
    ],
  ],
  use: {
    baseURL: demoOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 1000 },
        ...(process.env.E2E_WEBKIT_EXECUTABLE
          ? {
              launchOptions: {
                executablePath: process.env.E2E_WEBKIT_EXECUTABLE,
              },
            }
          : {}),
      },
    },
  ],
  webServer: [
    {
      command: "pnpm demo",
      url: demoOrigin,
      env: {
        REVIEW_PORT: String(demoPort),
        REVIEW_BUILD_DIR: ".next-e2e-demo",
      },
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: `pnpm start --port ${publicationPort}`,
      url: publicationOrigin,
      reuseExistingServer,
      timeout: 60_000,
    },
  ],
});
