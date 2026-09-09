import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isDemoEnabled } from "@/lib/content";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!isDemoEnabled()) return new Response("Not found", { status: 404 });
  const bytes = await readFile(
    join(process.cwd(), "fixtures", "media", "demo.mp4"),
  );
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(bytes.length),
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
