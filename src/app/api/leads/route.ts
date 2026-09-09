import { getProductByRef } from "@/lib/content";
import { handleLeadRequest } from "@/lib/lead-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleLeadRequest(request, { getProductByRef });
}
