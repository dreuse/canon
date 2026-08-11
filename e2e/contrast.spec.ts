import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Seed } from "./globalSetup";

const seed = JSON.parse(
  readFileSync(path.resolve("e2e/.auth/seed.json"), "utf8")
) as Seed;

const WCAG_AA_NORMAL_TEXT = 4.5;

function channelLuminance(channel: number) {
  const ratio = channel / 255;
  return ratio <= 0.03928
    ? ratio / 12.92
    : Math.pow((ratio + 0.055) / 1.055, 2.4);
}

function relativeLuminance([red, green, blue]: number[]) {
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

function parseRgb(color: string) {
  const parts = color.match(/-?\d+(\.\d+)?/g);
  if (!parts || parts.length < 3) {
    throw new Error(`could not read a colour from ${color}`);
  }
  return parts.slice(0, 3).map(Number);
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(
    relativeLuminance(parseRgb(foreground)),
    relativeLuminance(parseRgb(background))
  );
  const darker = Math.min(
    relativeLuminance(parseRgb(foreground)),
    relativeLuminance(parseRgb(background))
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test.use({ colorScheme: "dark" });

test("mermaid diagram labels meet the contrast bar in dark mode", async ({
  page,
}) => {
  await page.goto(seed.diagramDocumentUrl);

  const wrapper = page.locator(".mermaid-diagram-wrapper").first();
  await expect(wrapper).toBeVisible();
  await expect(wrapper.locator("svg")).toBeVisible();

  const labels = wrapper.locator(".nodeLabel");
  await expect(labels.first()).toBeVisible();

  const samples = await labels.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = window.getComputedStyle(node);
      let element: HTMLElement | null = node as HTMLElement;
      let background = "rgba(0, 0, 0, 0)";
      while (element) {
        const candidate = window.getComputedStyle(element).backgroundColor;
        if (candidate && !candidate.startsWith("rgba(0, 0, 0, 0")) {
          background = candidate;
          break;
        }
        element = element.parentElement;
      }
      return { text: node.textContent, color: style.color, background };
    })
  );

  expect(samples.length).toBeGreaterThan(0);

  for (const sample of samples) {
    const ratio = contrastRatio(sample.color, sample.background);
    expect(
      ratio,
      `label "${sample.text}" measured ${ratio.toFixed(2)}:1 (${sample.color} on ${sample.background})`
    ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  }
});
