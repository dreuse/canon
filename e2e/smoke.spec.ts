import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Seed } from "./globalSetup";

const seed = JSON.parse(
  readFileSync(path.resolve("e2e/.auth/seed.json"), "utf8")
) as Seed;

test("the signed in user reaches home with the sidebar rendered", async ({
  page,
}) => {
  await page.goto("/home");

  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: seed.collectionName })
  ).toBeVisible();
});

test("a new document keeps its title and body across a reload", async ({
  page,
}) => {
  const stamp = Date.now();
  const title = `Smoke ${stamp}`;
  const body = "This line must survive a reload.";

  await page.goto(`/collection/${seed.collectionId}/new`);

  const titleField = page.getByRole("textbox", { name: "Document title" });
  const editor = page.getByRole("textbox", { name: "Editor content" });

  await expect(titleField).toBeVisible();
  await titleField.pressSequentially(title);
  await titleField.press("Enter");
  await editor.pressSequentially(body);

  await expect(page).toHaveURL(new RegExp(`/doc/smoke-${stamp}`), {
    timeout: 30_000,
  });
  const documentUrl = page.url();

  await page.goto("/home");
  await page.goto(documentUrl);

  await expect(titleField).toHaveText(title);
  await expect(editor).toContainText(body);
});
