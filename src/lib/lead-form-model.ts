import { EMPTY_DRAFT, type Draft, type Saved } from "./lead-draft";
import type { LeadIntention } from "./lead-contract";

export type LeadFormContext = {
  variant: "contact" | "event";
  initialIntention?: LeadIntention;
  initialOccasion?: string;
  product?: { ref: string; name: string };
};

/** Context changes retain contact details, but never reuse another enquiry's identity. */
export function restoreLeadDraft(context: LeadFormContext, saved?: Saved) {
  const intention =
    context.variant === "event"
      ? "event"
      : context.initialIntention || saved?.draft.intention || "product";
  const contextChanged = Boolean(
    saved &&
    (saved.draft.intention !== intention ||
      (intention === "product" && saved.productRef !== context.product?.ref) ||
      (intention === "event" &&
        context.initialOccasion &&
        context.initialOccasion !== saved.occasionContext)),
  );
  const restored =
    saved && !contextChanged
      ? saved.draft
      : {
          ...EMPTY_DRAFT,
          name: saved?.draft.name || "",
          replyTo: saved?.draft.replyTo || "",
        };
  const draft: Draft = {
    ...restored,
    intention,
    occasion:
      intention === "event"
        ? contextChanged || !saved
          ? context.initialOccasion || ""
          : restored.occasion
        : "",
  };
  return { draft, contextChanged };
}

/** Drafts can be incomplete; the shared contract validates this payload before sending. */
export function buildLeadPayload(
  draft: Draft,
  variant: LeadFormContext["variant"],
  productRef?: string,
) {
  const common = {
    replyTo: draft.replyTo,
    message: draft.message,
    website: draft.website,
  };
  switch (draft.intention) {
    case "event":
      return {
        ...common,
        intention: "event",
        name: variant === "contact" ? draft.name : undefined,
        occasion: draft.occasion,
        date: draft.dateUndecided ? undefined : draft.date,
        dateUndecided: draft.dateUndecided,
        location: draft.location,
        budget: draft.budget,
      };
    case "product":
      return { ...common, intention: "product", name: draft.name, productRef };
    case "visit":
      return { ...common, intention: "visit", name: draft.name };
    default:
      throw new Error("Unsupported lead intention");
  }
}
