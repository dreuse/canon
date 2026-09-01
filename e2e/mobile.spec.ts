import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import type { Seed } from "./globalSetup";

const seed = JSON.parse(
  readFileSync(path.resolve("e2e/.auth/seed.json"), "utf8")
) as Seed;

const PHONE = { width: 360, height: 740 };

const USABLE_SEARCH_WIDTH = 120;

const VIEWPORTS = [
  { name: "phone", label: "a 360px viewport", size: PHONE },
  {
    name: "zoomed",
    label: "640px at 200% zoom",
    size: { width: 320, height: 512 },
  },
];

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
    name: "document",
    url: seed.documentUrl,
    ready: (page: Page) => page.locator(".ProseMirror").first(),
  },
  {
    name: "drafts",
    url: "/drafts",
    ready: (page: Page) => page.getByRole("heading", { name: "Drafts" }),
  },
  {
    name: "archive",
    url: "/archive",
    ready: (page: Page) => page.getByRole("heading", { name: "Archive" }),
  },
  {
    name: "trash",
    url: "/trash",
    ready: (page: Page) => page.getByRole("heading", { name: "Trash" }),
  },
  {
    name: "profile",
    url: `/users/${seed.userId}`,
    ready: (page: Page) =>
      page.getByRole("heading", { name: seed.userName }).first(),
  },
  {
    name: "settings",
    url: "/settings",
    ready: (page: Page) =>
      page.getByRole("heading", { name: "Profile", level: 1 }),
  },
];

test.describe("phone geometry", () => {
  test.use({ viewport: PHONE });

  test("the edit action matches the other header icons on a phone", async ({
    page,
  }) => {
    await page.goto(seed.documentUrl);
    await expect(page.getByText(seed.documentTitle).first()).toBeVisible();

    const chrome = await page.evaluate(() => {
      const read = (node: Element | null) =>
        node ? window.getComputedStyle(node).boxShadow : null;
      return {
        edit: read(document.querySelector('a[href*="/edit"]')),
        siblingMenu: read(
          document.querySelector('header [aria-label="Document options"]') ??
            document.querySelector('[aria-label="Table of contents"]')
        ),
      };
    });

    expect(
      chrome.edit,
      "the edit action draws a permanent box the sibling header icons do not"
    ).toBe("none");
    expect(chrome.siblingMenu).toBe("none");
  });

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
      throw new Error(
        "expected the title and the order control to be laid out"
      );
    }

    expect(
      orderBox.y,
      "the order control overlaps the wrapped collection title"
    ).toBeGreaterThanOrEqual(headingBox.y + headingBox.height);
  });

  test("the collection header search is not squeezed on a phone", async ({
    page,
  }) => {
    await page.goto(`/collection/${seed.collectionId}`);

    await expect(
      page.getByRole("heading", { name: seed.collectionName })
    ).toBeVisible();

    const search = page.getByPlaceholder("Search in collection…");
    const box = (await search.count())
      ? await search.first().boundingBox()
      : null;

    expect(
      box?.width ?? USABLE_SEARCH_WIDTH,
      "the header search field is too narrow to read what you type"
    ).toBeGreaterThanOrEqual(USABLE_SEARCH_WIDTH);
  });
});

for (const viewport of VIEWPORTS) {
  test.describe(viewport.label, () => {
    test.use({ viewport: viewport.size });

    for (const screen of SCREENS) {
      test(`${screen.name} fits ${viewport.label} without sideways scrolling`, async ({
        page,
      }) => {
        await page.goto(screen.url);

        await expect(screen.ready(page)).toBeVisible();

        await page.screenshot({
          path: `test-results/mobile-${viewport.name}-${screen.name}.png`,
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
  });
}
