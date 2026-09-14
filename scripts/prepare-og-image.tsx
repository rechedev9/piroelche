import { ImageResponse } from "next/og";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { getContent } from "../src/lib/content";
import { SITE_NAME } from "../src/lib/seo";

/**
 * Renders the shared Open Graph card (1200x630) to `src/app/opengraph-image.png`
 * so Next serves it as a static metadata file: no runtime font loading and no
 * trailing-slash redirect on the image URL. Run `pnpm brand:og` after changing
 * the logo, the store address or the copy below.
 */
async function main() {
  const { store } = getContent();
  const [{ data: logo, info }, lilita, manrope] = await Promise.all([
    sharp("public/brand/logo-header.webp")
      .png()
      .toBuffer({ resolveWithObject: true }),
    readFile(
      "node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff",
    ),
    readFile(
      "node_modules/@fontsource/manrope/files/manrope-latin-700-normal.woff",
    ),
  ]);
  const size = { width: 1200, height: 630 };
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  // Keep the logo's own aspect ratio so a new mark is never squashed.
  const logoWidth = 640;
  const logoHeight = Math.round((logoWidth * info.height) / info.width);

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
        fontFamily: "Manrope",
        position: "relative",
      }}
    >
      {/* Satori renders plain <img>; next/image does not apply here. */}
      {/* oxlint-disable-next-line next/no-img-element */}
      <img src={logoSrc} width={logoWidth} height={logoHeight} alt="" />
      <div
        style={{
          marginTop: 28,
          fontFamily: "Lilita One",
          fontSize: 58,
          lineHeight: 1.05,
          color: "#ffe500",
          textAlign: "center",
        }}
      >
        Pirotecnia en Elche
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 30,
          color: "#e8e6e0",
          textAlign: "center",
        }}
      >
        Fuegos artificiales · Humo de color · Fuego frío · Tracas
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 44,
          fontSize: 24,
          letterSpacing: 2,
          color: "#9a97a0",
          textTransform: "uppercase",
        }}
      >
        {`${SITE_NAME} · ${store.address}`}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 12,
          background: "linear-gradient(90deg, #ffe500 0%, #ee1c8c 100%)",
        }}
      />
    </div>,
    {
      ...size,
      fonts: [
        { name: "Lilita One", data: lilita, style: "normal", weight: 400 },
        { name: "Manrope", data: manrope, style: "normal", weight: 700 },
      ],
    },
  );
  const png = Buffer.from(await image.arrayBuffer());
  await writeFile("src/app/opengraph-image.png", png);
  console.log(`Open Graph image written: ${png.length} bytes.`);
}
void main();
