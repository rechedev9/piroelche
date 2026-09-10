import type { NextConfig } from "next";

const config: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  devIndicators: false,
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  images: {
    // AVIF first with WebP as fallback; the allowlist has to name every quality
    // used in the app (Next 16 restricts the optimizer to these values).
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.PIROBOOM_PUBLIC_SITE === "1" &&
          process.env.VERCEL_ENV !== "preview" &&
          process.env.PIROBOOM_DEMO !== "1"
            ? []
            : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
        ],
      },
    ];
  },
};
export default config;
