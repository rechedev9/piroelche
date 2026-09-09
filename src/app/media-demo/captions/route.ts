import { isDemoEnabled } from "@/lib/content";
export const dynamic = "force-dynamic";
export function GET() {
  if (!isDemoEnabled()) return new Response("Not found", { status: 404 });
  return new Response(
    "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nDemostración técnica sin sonido. No muestra un producto.\n",
    {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
