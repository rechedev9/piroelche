export const BUSINESS_TIME_ZONE = "Europe/Madrid";

const localFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function getMadridParts(now: Date) {
  if (!Number.isFinite(now.getTime()))
    throw new RangeError("La fecha de consulta no es válida");
  const parts = Object.fromEntries(
    localFormatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function getMadridDate(now: Date = new Date()): string {
  return getMadridParts(now).date;
}
