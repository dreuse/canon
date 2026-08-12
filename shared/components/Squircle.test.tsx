/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "styled-components";
import { buildDarkTheme } from "../styles/theme";
import { contrastRatio } from "../utils/oklch";
import Squircle from "./Squircle";
import { SurfaceProvider } from "./SurfaceContext";

const dark = buildDarkTheme({});

const DARK_COLLECTION_COLOR = "#2F362F";
const LIGHT_COLLECTION_COLOR = "#2BC2FF";

function renderSquircle(color: string, surface?: string) {
  const tree: ReactNode = <Squircle color={color} />;

  const { container } = render(
    <ThemeProvider theme={dark}>
      {surface ? (
        <SurfaceProvider value={surface}>{tree}</SurfaceProvider>
      ) : (
        tree
      )}
    </ThemeProvider>
  );

  return container.querySelector("svg")?.getAttribute("fill") ?? "";
}

describe("Squircle", () => {
  it("lifts a fill that cannot be seen against the content plane", () => {
    const fill = renderSquircle(DARK_COLLECTION_COLOR);

    expect(fill).not.toBe(DARK_COLLECTION_COLOR);
    expect(contrastRatio(fill, dark.background)).toBeGreaterThanOrEqual(3);
  });

  it("measures against the declared surface rather than the content plane", () => {
    const onContent = renderSquircle(DARK_COLLECTION_COLOR);
    const onMenu = renderSquircle(DARK_COLLECTION_COLOR, dark.menuBackground);

    expect(onMenu).not.toBe(onContent);
    expect(contrastRatio(onMenu, dark.menuBackground)).toBeGreaterThanOrEqual(
      3
    );
    expect(contrastRatio(onContent, dark.menuBackground)).toBeLessThan(3);
  });

  it("leaves a fill that already passes untouched", () => {
    expect(renderSquircle(LIGHT_COLLECTION_COLOR)).toBe(LIGHT_COLLECTION_COLOR);
  });
});
