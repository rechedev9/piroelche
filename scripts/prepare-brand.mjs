import { mkdir, copyFile } from "node:fs/promises";
// public/brand/logo.webp and logo-header.webp carry the new Piroboom mark,
// which the handoff logo predates. They are committed as prepared assets, so
// this script must not regenerate them from the handoff.
await mkdir("public/brand", { recursive: true });
await mkdir("docs/licenses", { recursive: true });
// The favicon uses the compact O/firework adaptation of the supplied logo.
await import("./prepare-favicons.mjs");
await copyFile(
  "node_modules/@fontsource/lilita-one/LICENSE",
  "docs/licenses/Lilita-One.txt",
);
await copyFile(
  "node_modules/@fontsource-variable/manrope/LICENSE",
  "docs/licenses/Manrope.txt",
);
