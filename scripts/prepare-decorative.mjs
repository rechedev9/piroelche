// Re-encodes the approved decorative backgrounds as WebP without touching the
// original files or their framing: same pixels, smaller transfer.
import sharp from "sharp";
const sources = ["public/media/decorative/home-fireworks-v1.png"];
for (const source of sources) {
  const target = source.replace(/\.png$/, ".webp");
  await sharp(source).webp({ quality: 80 }).toFile(target);
  console.log(`${source} -> ${target}`);
}
