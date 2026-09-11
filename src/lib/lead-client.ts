import { parseLeadResponse, type LeadApiResponse } from "./lead-contract";

export async function fingerprintPayload(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** HTTP status and receipt must agree before a form can announce success. */
export async function sendLead(
  body: string,
  key: string,
  signal: AbortSignal,
  fetcher: typeof fetch = globalThis.fetch,
): Promise<LeadApiResponse> {
  const response = await fetcher("/api/leads/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body,
    signal,
  });
  const result = parseLeadResponse(await response.json());
  if (!result) throw new Error("invalid_lead_response");
  if (
    result.ok &&
    !(
      (response.status === 201 && !result.replayed) ||
      (response.status === 200 && result.replayed)
    )
  )
    throw new Error("invalid_lead_receipt_status");
  return result;
}
