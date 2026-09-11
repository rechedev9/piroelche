import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { startLocalReceiver } from "./local-receiver";

async function main() {
  if (process.env.VERCEL || process.env.VERCEL_ENV)
    throw new Error("La revisión local no se puede iniciar en Vercel.");
  const port = Number(process.env.REVIEW_PORT || 3000);
  const receiverPort = Number(process.env.REVIEW_RECEIVER_PORT || 4010);
  const token = randomBytes(32).toString("hex");
  const storageDirectory = join(
    process.env.LOCALAPPDATA || process.cwd(),
    "Piroboom",
    "review-receiver",
  );
  // Isolated synthetic QA traffic; the standalone receiver keeps its stricter default.
  const receiver = await startLocalReceiver({
    storageDirectory,
    token,
    port: receiverPort,
    clientLimit: 100,
    globalLimit: 500,
  });
  const child = spawn(
    process.execPath,
    [
      ...(process.env.REVIEW_NOW
        ? ["--import", "./scripts/review-clock.mjs"]
        : []),
      join("node_modules", "next", "dist", "bin", "next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      windowsHide: true,
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_BUILD_DIR: process.env.REVIEW_BUILD_DIR || ".next-demo",
        NEXT_TELEMETRY_DISABLED: "1",
        PIROBOOM_DEMO: "1",
        PIROBOOM_LOCAL_REVIEW: "1",
        PIROBOOM_PUBLIC_SITE: "0",
        PIROBOOM_SITE_URL: `http://127.0.0.1:${port}`,
        LEADS_RECEIVER_MODE: "local-test",
        LEADS_RECEIVER_URL: `http://127.0.0.1:${receiverPort}/leads`,
        LEADS_RECEIVER_TOKEN: token,
        LEADS_ALLOWED_ORIGINS: `http://127.0.0.1:${port}`,
        LEADS_TRUST_PROXY: "0",
      },
    },
  );
  let stopping = false;
  async function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    if (child.pid && child.exitCode == null) {
      if (process.platform === "win32")
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      else child.kill("SIGTERM");
    }
    await receiver.close();
    process.exitCode = code;
  }
  child.once("error", () => {
    console.error("No se ha podido iniciar la revisión local.");
    void stop(1);
  });
  child.once("exit", (code) => {
    void stop(code || 0);
  });
  process.once("SIGINT", () => {
    void stop();
  });
  process.once("SIGTERM", () => {
    void stop();
  });
  console.log(
    `Revisión local: http://127.0.0.1:${port} · receptor local real, sin mensajes al negocio.`,
  );
}
void main().catch(() => {
  console.error(
    "No se ha podido iniciar la revisión local. Comprueba los puertos y el almacenamiento privado.",
  );
  process.exitCode = 1;
});
