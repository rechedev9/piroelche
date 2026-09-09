import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";
import manifest from "../public/media/catalogo-2026/manifest.json";
import siteRaw from "../content/site.json";
import { ContentSchema } from "../src/lib/content-schema";
import {
  cataloguePages,
  getCataloguePage,
  getFamilyCataloguePages,
} from "../src/lib/catalogue";

const site = ContentSchema.parse(siteRaw);

void test("the complete web catalogue preserves all original pages and readable local derivatives", async () => {
  assert.equal(manifest.source.pageCount, 16);
  assert.deepEqual(
    cataloguePages.map((page) => page.page),
    Array.from({ length: 16 }, (_, index) => index + 1),
  );
  for (const page of manifest.pages) {
    for (const [src, hash, width, height] of [
      [page.src, page.sha256, page.width, page.height],
      [page.thumb, page.thumbSha256, page.thumbWidth, page.thumbHeight],
    ] as const) {
      const bytes = readFileSync(`public${src}`);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), hash, src);
      const image = await sharp(bytes).metadata();
      assert.equal(image.width, width);
      assert.equal(image.height, height);
      assert.equal(image.format, "webp");
    }
    const text = readFileSync(`public${page.textUrl}`, "utf8");
    assert.equal(text, page.text);
    assert.equal(
      createHash("sha256").update(text).digest("hex"),
      page.textSha256,
    );
  }
});

void test("catalogue navigation handles invalid query values and covers all four families", () => {
  for (const invalid of [
    undefined,
    "",
    "0",
    "17",
    "-1",
    "1.5",
    "13foo",
    "../13",
    ["8", "9"],
  ])
    assert.equal(getCataloguePage(invalid).page, 1);
  assert.equal(getCataloguePage("8").title, "TRACAS");
  assert.equal(getCataloguePage("16").page, 16);
  for (const family of site.families) {
    const related = getFamilyCataloguePages(family.id);
    assert.ok(related.length > 0, family.id);
    assert.ok(related.every((page) => page.page > 1 && page.page < 16));
    assert.ok(family.image?.src, family.id);
  }
  assert.match(getFamilyCataloguePages("frio")[0].text, /FRIO/);
  assert.deepEqual(getFamilyCataloguePages("unknown"), []);
});

void test("brand, solutions and family images have physical local files with reserved dimensions", async () => {
  assert.ok(site.brand);
  const images = [
    ...site.families.map((family) => family.image),
    ...site.solutions.map((solution) => solution.image),
    site.store.image,
    site.brand.hero,
    site.brand.eventHero,
    site.brand.storeWelcome,
    site.brand.storeDetail,
    ...site.brand.gallery,
  ];
  for (const image of images) {
    assert.ok(image?.src);
    const metadata = await sharp(readFileSync(`public${image.src}`)).metadata();
    assert.equal(metadata.width, image.width, image.src);
    assert.equal(metadata.height, image.height, image.src);
    assert.ok(image.alt.trim().length > 0);
    assert.equal(image.provenance.pending.length, 0);
    assert.ok(image.provenance.checkedAt);
  }
});
