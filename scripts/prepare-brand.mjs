import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
const source = "piroboom-handoff/inputs/diseno/assets/logo.png";
await mkdir("public/brand", { recursive: true });
await mkdir("docs/licenses", { recursive: true });
await sharp(source)
  .resize(552, 184)
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
