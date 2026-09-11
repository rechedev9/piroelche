import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const source = "assets/brand/favicon-source-v2.png";
await mkdir("public/brand", { recursive: true });
// 192/512 feed the web manifest (`src/app/manifest.ts`).
const sizes = [16, 32, 48, 180, 192, 512];
const images = [];
for (const size of sizes) {
  const png = await sharp(source)
    .resize(size, size, { fit: "contain", background: "#0d0d10" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const name =
    size === 180
      ? "apple-icon-v2"
      : size >= 192
        ? `icon-v2-${size}`
        : `favicon-v2-${size}`;
  await writeFile(`public/brand/${name}.png`, png);
  if (size <= 48) images.push({ size, png });
}

// ICO supports PNG entries. Include native tab sizes and a 48px fallback.
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
for (const [index, { size, png }] of images.entries()) {
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}
const ico = Buffer.concat([header, ...images.map(({ png }) => png)]);
await writeFile("public/brand/favicon-v2.ico", ico);
await writeFile("public/favicon.ico", ico);
console.log(
  "Favicons preparados: PNG 16/32/48, ICO, Apple 180 y manifest 192/512.",
);
