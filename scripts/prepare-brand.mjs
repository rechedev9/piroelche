import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
const source = "piroboom-handoff/inputs/diseno/assets/logo.png";
await mkdir("public/brand", { recursive: true });
await mkdir("docs/licenses", { recursive: true });
await sharp(source)
  .resize(552, 184)
  .webp({ quality: 92 })
  .toFile("public/brand/logo.webp");
// Faithful crop of the supplied yellow P, not a new mark or a vector redraw.
for (const size of [16, 32, 180])
  await sharp(source)
    .extract({ left: 155, top: 232, width: 265, height: 310 })
    .resize(size, size, { fit: "contain", background: "#000000" })
    .png()
    .toFile(
      `public/brand/${size === 180 ? "apple-icon" : `favicon-${size}`}.png`,
    );
await copyFile(
  "node_modules/@fontsource/lilita-one/LICENSE",
  "docs/licenses/Lilita-One.txt",
);
await copyFile(
  "node_modules/@fontsource-variable/manrope/LICENSE",
  "docs/licenses/Manrope.txt",
);
