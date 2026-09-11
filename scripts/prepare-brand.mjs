import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
// The transparent header mark is the committed source of the current logo;
// the handoff logo predates it. logo.webp is the same mark on the site's
// black ground for structured data; `pnpm brand:og` renders the transparent
// mark onto the Open Graph card.
const source = "public/brand/logo-header.webp";
await mkdir("public/brand", { recursive: true });
await mkdir("docs/licenses", { recursive: true });
await sharp(source)
  .resize({ width: 552 })
  .flatten({ background: "#000" })
  .webp({ quality: 92 })
  .toFile("public/brand/logo.webp");
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
