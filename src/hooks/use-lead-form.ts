"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { eventRequestHref } from "@/lib/navigation";
import {
  validateLead,
  type LeadApiResponse,
  type LeadFieldErrors,
  type LeadIntention,
  type LeadMode,
} from "@/lib/lead-contract";
import { EMPTY_DRAFT, type Draft, type Submission } from "@/lib/lead-draft";
import {
  clearDraft,
  readDraftSnapshot,
  saveDraft,
} from "@/lib/lead-draft-store";
import { useLeadDraft } from "./use-lead-draft";
import { track } from "@/lib/analytics";
import { fingerprintPayload, sendLead } from "@/lib/lead-client";
import {
  buildLeadPayload,
  restoreLeadDraft,
  type LeadFormContext,
} from "@/lib/lead-form-model";

export type LeadFormOptions = LeadFormContext & {
  availability: { enabled: boolean; mode: LeadMode };
};

export function useLeadForm({
  variant,
  initialIntention,
  initialOccasion,
  product,
  availability,
}: LeadFormOptions) {
  const router = useRouter();
  const storageKey = `piroboom.${variant}.draft.v1`;
  const [editedDraft, setEditedDraft] = useState<Draft>();
  const [productRemoved, setProductRemoved] = useState(false);
  const submission = useRef<Submission | null | undefined>(undefined);
  const { saved, ready } = useLeadDraft(
    storageKey,
    useCallback(() => {
      setEditedDraft(undefined);
      submission.current = null;
    }, []),
  );
  const currentProduct = productRemoved ? undefined : product;
  const { draft: restoredDraft, contextChanged } = restoreLeadDraft(
    { variant, initialIntention, initialOccasion, product: currentProduct },
    saved,
  );
  const draft = editedDraft || restoredDraft;
  const selectedProduct =
    draft.intention === "product" ? currentProduct : undefined;
  const [errors, setErrors] = useState<LeadFieldErrors>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] =
    useState<Extract<LeadApiResponse, { ok: true }>>();
  const inFlight = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  useEffect(() => () => requestController.current?.abort(), []);
  const started = useRef(false);
  function currentSubmission() {
    return submission.current === undefined
      ? contextChanged
        ? undefined
        : saved?.submission
      : submission.current || undefined;
  }
  function markStarted() {
    if (!started.current) {
      started.current = true;
      track({ name: "lead_start" });
    }
  }
  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch };
    setEditedDraft(next);
    // Drop stale inline errors for the fields being edited so a corrected
    // control stops reading as invalid before the next submit.
    const touched = new Set<string>(Object.keys(patch));
    if (touched.has("dateUndecided")) touched.add("date");
    setErrors((current) => {
      const stale = Object.keys(current).filter((field) => touched.has(field));
      if (!stale.length) return current;
      return Object.fromEntries(
        Object.entries(current).filter(([field]) => !touched.has(field)),
      );
    });
    saveDraft(
      storageKey,
      next,
      currentSubmission(),
      selectedProduct?.ref,
      draft.intention === "event" ? initialOccasion : undefined,
    );
  }
  function changeIntention(intention: LeadIntention) {
    const next = {
      ...draft,
      intention,
      message: "",
      occasion: "",
      date: "",
      dateUndecided: false,
      location: "",
      budget: "",
      website: "",
    };
    setEditedDraft(next);
    setProductRemoved(true);
    saveDraft(storageKey, next);
    submission.current = null;
    setErrors({});
    setError("");
    router.replace(
      `/contacto/?motivo=${{ product: "producto", event: "evento", visit: "visita" }[intention]}`,
      { scroll: false },
    );
  }
  function removeProduct() {
    setEditedDraft(draft);
    setProductRemoved(true);
    submission.current = null;
    saveDraft(storageKey, draft);
    setErrors({});
    setError("");
    router.replace("/contacto/?motivo=producto", { scroll: false });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !ready) return;
    setError("");
    setErrors({});
    const validation = validateLead(
      buildLeadPayload(draft, variant, selectedProduct?.ref),
    );
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      return;
    }
    if (!availability.enabled) {
      setError(
        "El formulario no está disponible todavía. Puedes llamar a la tienda.",
      );
      return;
    }
    inFlight.current = true;
    setSending(true);
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const body = JSON.stringify(validation.data);
      const beforeFingerprint = readDraftSnapshot(storageKey);
      const hash = await fingerprintPayload(body);
      if (
        controller.signal.aborted ||
        readDraftSnapshot(storageKey) !== beforeFingerprint
      )
        return;
      const previous = currentSubmission();
      const nextSubmission =
        previous?.fingerprint === hash
          ? previous
          : { key: crypto.randomUUID(), fingerprint: hash };
      submission.current = nextSubmission;
      const sentSnapshot = saveDraft(
        storageKey,
        draft,
        nextSubmission,
        selectedProduct?.ref,
        draft.intention === "event" ? initialOccasion : undefined,
      );
      const result = await sendLead(
        body,
        nextSubmission.key,
        controller.signal,
      );
      if (result.ok) {
        setReceipt(result);
        track({ name: "lead_received" });
        setEditedDraft(undefined);
        submission.current = null;
        if (sentSnapshot !== undefined) clearDraft(storageKey, sentSnapshot);
      } else {
        track({ name: "lead_error" });
        setError(result.message);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    } catch {
      track({ name: "lead_error" });
      setError(
        "No se ha podido confirmar el registro. Tu consulta se conserva. Reintenta este mismo envío para evitar duplicados o llama a la tienda.",
      );
    } finally {
      clearTimeout(timeout);
      requestController.current = null;
      inFlight.current = false;
      setSending(false);
    }
  }
  function sendAnother() {
    setReceipt(undefined);
    setEditedDraft({
      ...EMPTY_DRAFT,
      intention: variant === "event" ? "event" : "product",
    });
    setProductRemoved(true);
    submission.current = null;
    started.current = false;
    if (variant === "contact") router.replace("/contacto/", { scroll: false });
    else if (initialOccasion)
      router.replace(eventRequestHref(), { scroll: false });
  }
  return {
    draft,
    selectedProduct,
    errors,
    error,
    sending,
    receipt,
    ready,
    markStarted,
    update,
    changeIntention,
    removeProduct,
    submit,
    sendAnother,
  };
}
