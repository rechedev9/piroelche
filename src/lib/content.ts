import "server-only";
import { cache } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import source from "../../content/site.json";
import {
  ContentSchema,
  DemoContentSchema,
  selectPublishedContent,
  type Family,
  type Product,
  type PublicContent,
} from "./content-schema";
import { getMadridDate } from "./hours";

// Evaluated by Next during the build as well as at server startup. Invalid public
// content fails the build; it is never silently repaired or replaced by fixtures.
const content = ContentSchema.parse(source);

export function isDemoEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    environment.PIROBOOM_DEMO === "1" &&
    environment.PIROBOOM_LOCAL_REVIEW === "1" &&
    !environment.VERCEL &&
    !environment.VERCEL_ENV
  );
}

// Share a single dated snapshot during a server render. A new request evaluates
// publication dates and local fixtures again, including in long-lived processes.
export const getContent = cache(function getContent(): PublicContent {
  const isDemo = isDemoEnabled();
  const today = getMadridDate();
  const result: PublicContent = {
    ...selectPublishedContent(content, today),
    isDemo,
  };
  if (isDemo) {
    // No client import and no public URL can activate or load this file. It is
    // read only by the explicitly configured local review server.
    const fixturePath = path.join(process.cwd(), "fixtures", "catalog.json");
    const fixtures = DemoContentSchema.parse(
      JSON.parse(readFileSync(fixturePath, "utf8")),
    );
    const merged = ContentSchema.parse({
      ...content,
      products: [...result.products, ...fixtures.products],
      cases: [...result.cases, ...fixtures.cases],
      // The ordinary review uses the same locations as the public site. Only an
      // explicit local QA flag replaces them to exercise dated campaign states.
      campaigns:
        process.env.REVIEW_CAMPAIGNS === "1"
          ? fixtures.campaigns
          : result.campaigns,
    });
    result.products = merged.products;
    result.cases = merged.cases;
    result.campaigns = merged.campaigns;
  }
  return result;
});

export function getProductByRef(ref: string): Product | undefined {
  return getContent().products.find((product) => product.ref === ref);
}

export function getFamily(familySlug: string): Family | undefined {
  return getContent().families.find((family) => family.slug === familySlug);
}

export function getProduct(
  familySlug: string,
  productSlug: string,
): Product | undefined {
  const publicContent = getContent();
  const family = publicContent.families.find(
    (item) => item.slug === familySlug,
  );
  return family
    ? publicContent.products.find(
        (product) =>
          product.familyId === family.id && product.slug === productSlug,
      )
    : undefined;
}
