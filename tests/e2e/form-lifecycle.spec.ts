import { expect, test } from "@playwright/test";

test("contact and event forms reload without hydration errors and retain their draft", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/contacto/?motivo=visita", "/eventos/"]) {
    await page.goto(path);
    const submit = page.locator(".lead-form button[type=submit]");
    await expect(submit).toBeEnabled();
    await page
      .getByLabel("Cómo te respondemos", { exact: true })
      .fill("qa@example.test");
    await page.reload();
    await expect(submit).toBeEnabled();
    await expect(
      page.getByLabel("Cómo te respondemos", { exact: true }),
    ).toHaveValue("qa@example.test");
  }
  expect(errors).toEqual([]);
});

test("an expired draft is removed from both the visible form and session storage", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/contacto/?motivo=visita");
  await expect(page.locator(".lead-form button[type=submit]")).toBeEnabled();
  await page.getByLabel("Tu nombre", { exact: true }).fill("QA caducidad");
  await page
    .getByLabel("Cómo te respondemos", { exact: true })
    .fill("qa@example.test");
  await page.clock.fastForward(30 * 60_000 + 1);
  await expect(page.getByLabel("Tu nombre", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("Cómo te respondemos", { exact: true }),
  ).toHaveValue("");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("piroboom.contact.draft.v1"),
    ),
  ).toBeNull();
});
