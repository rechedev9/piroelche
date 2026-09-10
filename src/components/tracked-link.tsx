"use client";
import Link from "next/link";
import { useEffect, type ComponentProps } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

export function TrackedLink({
  event,
  href,
  children,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { event: AnalyticsEvent }) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(click) => {
        // The caller's handler runs first and may cancel the navigation it tracks.
        onClick?.(click);
        if (!click.defaultPrevented) track(event);
      }}
    >
      {children}
    </Link>
  );
}

export function ViewEvent({ event }: { event: AnalyticsEvent }) {
  const name = event.name;
  const category = "category" in event ? event.category : "";
  const reference = "reference" in event ? event.reference : "";
  const journey = "journey" in event ? event.journey : "product";
  useEffect(() => {
    if (name === "view_category") track({ name, category });
    else if (name === "view_product") track({ name, reference });
    else if (name === "select_journey") track({ name, journey });
    else track({ name });
  }, [name, category, reference, journey]);
  return null;
}
