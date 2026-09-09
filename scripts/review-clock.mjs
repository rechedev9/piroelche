import { mock } from "node:test";

// Preloaded only by the local review launcher. Public app code never imports this.
if (
  process.env.PIROBOOM_LOCAL_REVIEW !== "1" ||
  process.env.VERCEL ||
  process.env.VERCEL_ENV
) {
  throw new Error("El reloj de pruebas solo se permite en revisión local.");
}
const timestamp = Date.parse(process.env.REVIEW_NOW || "");
if (!Number.isFinite(timestamp))
  throw new Error("REVIEW_NOW debe ser una fecha ISO válida.");
mock.timers.enable({ apis: ["Date"], now: timestamp });
