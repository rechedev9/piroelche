import { expect, type Locator } from "@playwright/test";

/**
 * Resolves once React has hydrated the element behind `locator`. A test that
 * edits server-rendered markup has to wait for this: an edit that lands first
 * fails hydration, React re-renders the tree on the client, the edit is lost
 * and every element the test holds is detached.
 */
export async function waitForHydration(locator: Locator) {
  // React tags each DOM node it hydrates with an internal `__reactFiber$` key.
  await expect
    .poll(() =>
      locator.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
      ),
    )
    .toBe(true);
}
