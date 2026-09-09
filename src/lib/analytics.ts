// No analytics provider, storage or third-party requests by default.
// An optional adapter must be configured only after consent has been obtained.
export type AnalyticsEvent =
  | { name: "select_journey"; journey: "product" | "event" | "visit" }
  | { name: "view_category"; category: string }
  | { name: "view_product"; reference: string }
  | {
      name:
        | "catalog_pdf_click"
        | "lead_start"
        | "lead_received"
        | "lead_error"
        | "click_directions"
        | "click_call";
    };

type Adapter = (event: AnalyticsEvent) => void;
let adapter: Adapter | undefined;
let consent = false;
export function configureAnalytics(
  next: Adapter | undefined,
  granted: boolean,
) {
  adapter = next;
  consent = granted;
}
export function revokeAnalytics() {
  consent = false;
  adapter = undefined;
}
export function track(event: AnalyticsEvent) {
  if (!consent || !adapter) return;
  // Reconstruct the event instead of forwarding arbitrary caller properties.
  let safe: AnalyticsEvent;
  if (event.name === "select_journey")
    safe = { name: event.name, journey: event.journey };
  else if (event.name === "view_category")
    safe = { name: event.name, category: event.category.slice(0, 80) };
  else if (event.name === "view_product")
    safe = { name: event.name, reference: event.reference.slice(0, 40) };
  else safe = { name: event.name };
  try {
    adapter(safe);
  } catch {
    /* An optional measurement failure must not break navigation or a lead. */
  }
}
