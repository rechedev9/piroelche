import type { Metadata } from "next";
import localFont from "next/font/local";
import { getContent } from "@/lib/content";
import { ContactBar, ContactIcon } from "@/components/contact-bar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  localBusinessJsonLd,
  publicIndexing,
  serializeJsonLd,
  siteUrl,
} from "@/lib/seo";
import "./globals.css";
import "./brand.css";
import "./catalogue.css";

const manrope = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "sans-serif"],
  variable: "--font-manrope",
});
const lilita = localFont({
  src: "../../node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["sans-serif"],
  variable: "--font-lilita",
});

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Piroboom · Pirotecnia en Elche",
    template: "%s | Piroboom",
  },
  description:
    "Catálogo de pirotecnia, consultas para celebraciones y tienda en Elche.",
  robots: { index: publicIndexing(), follow: publicIndexing() },
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/apple-icon.png",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isDemo, store, channels, campaigns } = getContent();
  return (
    <html lang="es" className={`${manrope.variable} ${lilita.variable}`}>
      <body>
        <div className="site-shell">
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <Header />
          <ContactBar />
          {isDemo && (
            <div className="review-banner" role="note">
              <strong>Demostración local.</strong> Productos y trabajos de
              ejemplo. No son un inventario ni servicios acreditados. Los envíos
              de prueba no llegan al negocio.
              {campaigns.some(
                (point) => point.provenance.kind === "prototype-fixture",
              ) && " Las campañas de esta prueba también son ficticias."}
            </div>
          )}
          <main id="contenido" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          {channels.whatsapp.enabled && channels.whatsapp.url && (
            <a
              href={channels.whatsapp.url}
              className="whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escribir por WhatsApp, nueva pestaña"
            >
              <ContactIcon name="whatsapp" size={20} />
              WhatsApp
            </a>
          )}
          {!isDemo && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: serializeJsonLd(localBusinessJsonLd(store)),
              }}
            />
          )}
        </div>
      </body>
    </html>
  );
}
