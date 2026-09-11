import type {
  CampaignPeriod,
  HoursException,
  Schedule,
  TimeInterval,
} from "./content-schema";

import { getMadridParts } from "./business-time";
export { BUSINESS_TIME_ZONE, getMadridDate } from "./business-time";

export type HoursLocation = {
  schedule: Schedule;
  exceptions: HoursException[];
  confirmedUntil?: string;
  exceptionsConfirmedUntil?: string;
  campaign?: CampaignPeriod;
};
export type LocationHoursStatus = {
  date: string;
  status: "unknown" | "open" | "closed" | "upcoming" | "ended";
  label: string;
  todayHours: string;
  scheduleConfirmed: boolean;
  campaignStatus: "none" | "unconfirmed" | "upcoming" | "active" | "ended";
  exceptionReason?: string;
};

export function formatIntervals(intervals: TimeInterval[]): string {
  return intervals.length
    ? intervals.map(({ opens, closes }) => `${opens}–${closes}`).join(" · ")
    : "Cerrado";
}

const dayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function formatSchedule(
  schedule: Schedule,
): { days: string; hours: string }[] {
  return schedule.map(({ days, intervals }) => {
    const consecutive = days.every(
      (day, index) => index === 0 || day === days[index - 1] + 1,
    );
    const label =
      days.length === 7
        ? "Todos los días"
        : days.length > 2 && consecutive
          ? `${dayNames[days[0]]} a ${dayNames[days[days.length - 1]].toLowerCase()}`
          : days
              .map((day, index) =>
                index === 0 ? dayNames[day] : dayNames[day].toLowerCase(),
              )
              .join(days.length === 2 ? " y " : ", ");
    return { days: label, hours: formatIntervals(intervals) };
  });
}

/** Confirmation dates are inclusive local dates. An overnight interval is split at 24:00 into both days. */
export function getLocationHours(
  location: HoursLocation,
  now: Date = new Date(),
): LocationHoursStatus {
  const { date, time } = getMadridParts(now);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const exception = location.exceptions.find((item) => item.date === date);
  const weeklyIntervals =
    location.schedule.find((row) => row.days.includes(weekday))?.intervals ??
    [];
  const intervals = exception?.confirmed
    ? exception.intervals
    : weeklyIntervals;
  const result: LocationHoursStatus = {
    date,
    status: "unknown",
    label: "Horario pendiente de reconfirmar",
    todayHours: formatIntervals(intervals),
    scheduleConfirmed: false,
    campaignStatus: "none",
    ...(exception?.confirmed && exception.reason
      ? { exceptionReason: exception.reason }
      : {}),
  };

  const campaign = location.campaign;
  if (campaign) {
    if (
      !campaign.confirmed ||
      !campaign.startsOn ||
      !campaign.endsOn ||
      !campaign.confirmedUntil
    ) {
      return {
        ...result,
        label: "Fechas de campaña sin confirmar",
        campaignStatus: "unconfirmed",
      };
    }
    if (date > campaign.endsOn) {
      return {
        ...result,
        status: "ended",
        label: "Campaña finalizada",
        campaignStatus: "ended",
      };
    }
    if (date > campaign.confirmedUntil) {
      return {
        ...result,
        label: "Campaña pendiente de reconfirmar",
        campaignStatus: "unconfirmed",
      };
    }
    if (date < campaign.startsOn) {
      return {
        ...result,
        status: "upcoming",
        label: "Próxima apertura",
        campaignStatus: "upcoming",
      };
    }
    result.campaignStatus = "active";
  }

  // A confirmed one-day exception is sufficient for that day. Otherwise both the
  // weekly schedule and the absence of additional exceptions must still be current.
  const scheduleConfirmed = exception
    ? exception.confirmed
    : Boolean(
        location.confirmedUntil &&
        location.confirmedUntil >= date &&
        location.exceptionsConfirmedUntil &&
        location.exceptionsConfirmedUntil >= date,
      );
  if (!scheduleConfirmed) return result;
  const open = intervals.some(
    ({ opens, closes }) => time >= opens && time < closes,
  );
  return {
    ...result,
    status: open ? "open" : "closed",
    label: open ? "Abierta ahora" : "Cerrada ahora",
    scheduleConfirmed: true,
  };
}
