import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import type { Seed } from "./globalSetup";

const seed = JSON.parse(
  readFileSync(path.resolve("e2e/.auth/seed.json"), "utf8")
) as Seed;

const PHONE = { width: 360, height: 740 };

const SCREENS = [
  {
    name: "home",
    url: "/home",
    ready: (page: Page) => page.getByRole("heading", { name: "Home" }),
  },
  {
    name: "search",
    url: "/search",
    ready: (page: Page) => page.getByPlaceholder(/Search/i).first(),
  },
  {
    name: "collection",
    url: `/collection/${seed.collectionId}`,
    ready: (page: Page) =>
      page.getByRole("heading", { name: seed.collectionName }),
  },
  {
    name: "editor",
    url: seed.documentUrl,
    ready: (page: Page) => page.getByRole("textbox", { name: "Document title" }),
  },
];

test.use({ viewport: PHONE });

test("the collection order control sits below the title on a phone", async ({
  page,
}) => {
  await page.goto(`/collection/${seed.collectionId}`);

  const heading = page.getByRole("heading", { name: seed.collectionName });
  const order = page.getByText("Collection order").first();

  await expect(heading).toBeVisible();
  await expect(order).toBeVisible();

  const headingBox = await heading.boundingBox();
  const orderBox = await order.boundingBox();

  if (!headingBox || !orderBox) {
    throw new Error("expected the title and the order control to be laid out");
  }

  expect(
    orderBox.y,
    "the order control overlaps the wrapped collection title"
  ).toBeGreaterThanOrEqual(headingBox.y + headingBox.height);
});

for (const screen of SCREENS) {
  test(`${screen.name} fits a 360px viewport without sideways scrolling`, async ({
    page,
  }) => {
    await page.goto(screen.url);

    await expect(screen.ready(page)).toBeVisible();

    await page.screenshot({
      path: `test-results/mobile-${screen.name}.png`,
      fullPage: true,
    });

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    expect(
      scrollWidth,
      `${screen.name} overflows by ${scrollWidth - innerWidth}px`
    ).toBeLessThanOrEqual(innerWidth);
  });
}
