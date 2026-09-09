import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CampaignPeriodSchema,
  ContentSchema,
  DateOnlySchema,
  ScheduleSchema,
  StoreSchema,
  type Schedule,
} from "../src/lib/content-schema";
import {
  formatSchedule,
  getLocationHours,
  getMadridDate,
  type HoursLocation,
} from "../src/lib/hours";

const store = ContentSchema.parse(
  JSON.parse(readFileSync("content/site.json", "utf8")),
).store;
const at = (iso: string) => new Date(iso);
const confirmed = (): HoursLocation => ({
  ...structuredClone(store),
  confirmedUntil: "2027-12-31",
  exceptionsConfirmedUntil: "2027-12-31",
});
const daily = (opens: string, closes: string): Schedule => [
  { days: [0, 1, 2, 3, 4, 5, 6], intervals: [{ opens, closes }] },
];
const campaign = (): HoursLocation => ({
  ...confirmed(),
  schedule: daily("10:00", "20:00"),
  campaign: {
    startsOn: "2026-12-19",
    endsOn: "2027-01-05",
    confirmed: true,
    confirmedUntil: "2027-01-05",
  },
});

void test("un horario publicado sin reconfirmación nunca indica Abierta ahora", () => {
  const result = getLocationHours(store, at("2026-09-09T10:00:00Z"));
  assert.equal(result.date, "2026-09-09");
  assert.equal(result.status, "unknown");
  assert.equal(result.scheduleConfirmed, false);
  assert.equal(result.todayHours, "10:00–14:00 · 17:00–20:00");
  assert.match(result.label, /reconfirmar/);
});

void test("los límites de mañana/tarde son inclusivos al abrir y exclusivos al cerrar", () => {
  const location = confirmed();
  for (const [iso, status] of [
    ["2026-09-08T07:59:59Z", "closed"],
    ["2026-09-08T08:00:00Z", "open"],
    ["2026-09-08T11:59:59Z", "open"],
    ["2026-09-08T12:00:00Z", "closed"],
    ["2026-09-08T14:59:59Z", "closed"],
    ["2026-09-08T15:00:00Z", "open"],
    ["2026-09-08T18:00:00Z", "closed"],
  ])
    assert.equal(getLocationHours(location, at(iso)).status, status, iso);
});

void test("lunes, domingo y sábado conservan el horario real publicado", () => {
  assert.equal(
    getLocationHours(confirmed(), at("2026-09-07T10:00:00Z")).status,
    "closed",
  );
  assert.equal(
    getLocationHours(confirmed(), at("2026-09-12T10:00:00Z")).status,
    "open",
  );
  assert.equal(
    getLocationHours(confirmed(), at("2026-09-12T15:00:00Z")).status,
    "closed",
  );
  assert.equal(
    getLocationHours(confirmed(), at("2026-09-13T10:00:00Z")).status,
    "closed",
  );
  assert.deepEqual(formatSchedule(store.schedule), [
    { days: "Martes a viernes", hours: "10:00–14:00 · 17:00–20:00" },
    { days: "Sábado", hours: "10:00–14:00" },
    { days: "Lunes y domingo", hours: "Cerrado" },
  ]);
});

void test("Europe/Madrid determina la fecha incluso cerca de medianoche y fin de año", () => {
  assert.equal(getMadridDate(at("2026-06-30T21:59:59Z")), "2026-06-30");
  assert.equal(getMadridDate(at("2026-06-30T22:00:00Z")), "2026-07-01");
  assert.equal(getMadridDate(at("2026-12-31T22:59:59Z")), "2026-12-31");
  assert.equal(getMadridDate(at("2026-12-31T23:00:00Z")), "2027-01-01");
  assert.throws(() => getMadridDate(new Date("invalid")), RangeError);
});

void test("la excepción del día nuevo se aplica al cruzar medianoche local", () => {
  const location = {
    ...confirmed(),
    schedule: daily("00:00", "24:00"),
    exceptions: [
      {
        date: "2027-01-01",
        intervals: [],
        confirmed: true,
        reason: "Festivo confirmado de prueba",
      },
    ],
  };
  assert.equal(
    getLocationHours(location, at("2026-12-31T22:59:59Z")).status,
    "open",
  );
  const after = getLocationHours(location, at("2026-12-31T23:00:00Z"));
  assert.equal(after.status, "closed");
  assert.equal(after.todayHours, "Cerrado");
  assert.equal(after.exceptionReason, "Festivo confirmado de prueba");
});

void test("antes, durante y después de una campaña que cruza fin de año son estados diferentes", () => {
  const location = campaign();
  assert.equal(
    getLocationHours(location, at("2026-12-18T22:59:59Z")).campaignStatus,
    "upcoming",
  );
  assert.equal(
    getLocationHours(location, at("2026-12-18T23:00:00Z")).campaignStatus,
    "active",
  );
  assert.equal(
    getLocationHours(location, at("2027-01-05T18:00:00Z")).status,
    "open",
  );
  assert.equal(
    getLocationHours(location, at("2027-01-05T22:59:59Z")).campaignStatus,
    "active",
  );
  const ended = getLocationHours(location, at("2027-01-05T23:00:00Z"));
  assert.equal(ended.campaignStatus, "ended");
  assert.equal(ended.status, "ended");
});

void test("una campaña activa fuera de horario no significa abierta ahora", () => {
  const result = getLocationHours(campaign(), at("2026-12-20T07:00:00Z"));
  assert.equal(result.campaignStatus, "active");
  assert.equal(result.status, "closed");
  assert.equal(result.label, "Cerrada ahora");
});

void test("fechas de ejemplo no confirmadas no anuncian una próxima apertura", () => {
  const location = campaign();
  location.campaign!.confirmed = false;
  for (const iso of [
    "2026-12-01T12:00:00Z",
    "2026-12-20T12:00:00Z",
    "2027-01-07T12:00:00Z",
  ]) {
    const result = getLocationHours(location, at(iso));
    assert.equal(result.campaignStatus, "unconfirmed");
    assert.equal(result.status, "unknown");
  }
});

void test("cada punto aplica sus horarios y excepciones de forma independiente", () => {
  const first = campaign();
  const second = campaign();
  first.exceptions = [
    {
      date: "2026-12-20",
      intervals: [],
      confirmed: true,
      reason: "Cierre de prueba",
    },
  ];
  assert.equal(
    getLocationHours(first, at("2026-12-20T12:00:00Z")).status,
    "closed",
  );
  assert.equal(
    getLocationHours(second, at("2026-12-20T12:00:00Z")).status,
    "open",
  );
  second.schedule = daily("17:00", "20:00");
  assert.equal(
    getLocationHours(second, at("2026-12-20T12:00:00Z")).status,
    "closed",
  );
});

void test("una excepción sin confirmar impide afirmar abierto o cerrado en ese momento", () => {
  const location = confirmed();
  location.exceptions = [
    { date: "2026-09-09", intervals: [], confirmed: false },
  ];
  const result = getLocationHours(location, at("2026-09-09T10:00:00Z"));
  assert.equal(result.status, "unknown");
  assert.equal(result.todayHours, "10:00–14:00 · 17:00–20:00");
});

void test("horario, excepciones y confirmación de campaña caducan por fecha local", () => {
  for (const field of ["confirmedUntil", "exceptionsConfirmedUntil"] as const) {
    const location = confirmed();
    location[field] = "2026-09-09";
    assert.equal(
      getLocationHours(location, at("2026-09-09T10:00:00Z")).status,
      "open",
    );
    assert.equal(
      getLocationHours(location, at("2026-09-09T22:00:00Z")).status,
      "unknown",
    );
  }
  const location = campaign();
  location.campaign!.confirmedUntil = "2026-12-20";
  assert.equal(
    getLocationHours(location, at("2026-12-20T12:00:00Z")).campaignStatus,
    "active",
  );
  assert.equal(
    getLocationHours(location, at("2026-12-20T23:00:00Z")).campaignStatus,
    "unconfirmed",
  );
});

void test("una excepción confirmada explícitamente cubre ese día aunque el horario general no lo esté", () => {
  const location: HoursLocation = {
    ...structuredClone(store),
    exceptions: [
      {
        date: "2026-09-09",
        intervals: [{ opens: "11:00", closes: "13:00" }],
        confirmed: true,
      },
    ],
  };
  assert.equal(
    getLocationHours(location, at("2026-09-09T10:00:00Z")).status,
    "open",
  );
  assert.equal(
    getLocationHours(location, at("2026-09-10T10:00:00Z")).status,
    "unknown",
  );
});

void test("los cambios de horario de verano no dependen de la zona del servidor", () => {
  const spring = { ...confirmed(), schedule: daily("01:00", "04:00") };
  assert.equal(
    getLocationHours(spring, at("2026-03-29T00:30:00Z")).status,
    "open",
  );
  assert.equal(
    getLocationHours(spring, at("2026-03-29T01:30:00Z")).status,
    "open",
  );
  assert.equal(
    getLocationHours(spring, at("2026-03-29T02:00:00Z")).status,
    "closed",
  );
  const autumn = { ...confirmed(), schedule: daily("02:00", "03:00") };
  assert.equal(
    getLocationHours(autumn, at("2026-10-25T00:30:00Z")).status,
    "open",
  );
  assert.equal(
    getLocationHours(autumn, at("2026-10-25T01:30:00Z")).status,
    "open",
  );
  assert.equal(
    getLocationHours(autumn, at("2026-10-25T02:00:00Z")).status,
    "closed",
  );
});

void test("un cambio de dato se refleja en presentación y cálculo sin horarios duplicados", () => {
  const location = confirmed();
  const instant = at("2026-09-09T14:30:00Z");
  assert.equal(getLocationHours(location, instant).status, "closed");
  location.schedule[0].intervals[1].opens = "16:00";
  assert.equal(getLocationHours(location, instant).status, "open");
  assert.equal(
    formatSchedule(location.schedule)[0].hours,
    "10:00–14:00 · 16:00–20:00",
  );
});

void test("validación estricta evita fechas imposibles, días duplicados y tramos incoherentes", () => {
  assert.equal(DateOnlySchema.safeParse("2026-02-29").success, false);
  assert.equal(DateOnlySchema.safeParse("2028-02-29").success, true);
  assert.equal(
    ScheduleSchema.safeParse([{ days: [0, 1, 2, 3, 4, 5, 5], intervals: [] }])
      .success,
    false,
  );
  assert.equal(
    ScheduleSchema.safeParse(daily("20:00", "10:00")).success,
    false,
  );
  assert.equal(
    ScheduleSchema.safeParse(daily("10:00", "10:00")).success,
    false,
  );
  assert.equal(
    ScheduleSchema.safeParse([
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        intervals: [
          { opens: "10:00", closes: "14:00" },
          { opens: "13:00", closes: "16:00" },
        ],
      },
    ]).success,
    false,
  );
  assert.equal(
    CampaignPeriodSchema.safeParse({
      startsOn: "2026-12-19",
      endsOn: "2026-01-05",
      confirmed: true,
      confirmedUntil: "2027-01-05",
    }).success,
    false,
  );
  assert.equal(
    CampaignPeriodSchema.safeParse({ confirmed: true }).success,
    false,
  );
  const exception = { date: "2026-09-09", intervals: [], confirmed: true };
  assert.equal(
    StoreSchema.safeParse({ ...store, exceptions: [exception, exception] })
      .success,
    false,
  );
});
