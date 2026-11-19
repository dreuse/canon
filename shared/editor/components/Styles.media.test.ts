import { buildDarkTheme, light } from "../../styles/theme";
import { isFullWidthImage } from "./Image";
import {
  codeScrollbarStyle,
  fullWidthImageShift,
  mermaidBoxStyle,
  tableScrollableStyle,
} from "./Styles";

const dark = buildDarkTheme({});

describe("editor media styles", () => {
  it("R13 boxes mermaid diagrams with a card background and a 1px line", () => {
    const css = mermaidBoxStyle(dark);

    expect(css).toContain("background:");
    expect(css).toContain(`border: 1px solid ${dark.divider}`);
    expect(css).toContain("border-radius: 8px");
  });

  it("R13 keeps the light diagram box on the page background", () => {
    expect(mermaidBoxStyle(light)).toContain(`background: ${light.background}`);
  });

  it("R13 lifts the dark diagram box above the page background", () => {
    expect(mermaidBoxStyle(dark)).toContain("background: #262930");
  });

  it("R13 centres a full-width image on the text column at its capped size", () => {
    expect(fullWidthImageShift).toBe(
      "var(--full-width-shift, calc((100% - var(--full-width-size, var(--container-width))) / 2 + var(--full-width-transform-offset)))"
    );
  });

  it("R13 fits a wide image to the text column unless the author picks full width", () => {
    expect(isFullWidthImage({ width: 960 })).toBe(false);
    expect(isFullWidthImage({ width: 960, layoutClass: "full-width" })).toBe(
      true
    );
  });

  it("R13 gives read-only tables no side margin or padding", () => {
    const css = tableScrollableStyle(true);

    expect(css).not.toMatch(/margin:[^;]*-\d+px/);
    expect(css).toContain("margin: -1em 0 -0.5em");
    expect(css).toContain("padding-left: 0");
    expect(css).toContain("padding-right: 0");
  });

  it("R13 keeps the editing gutter for table grips", () => {
    expect(tableScrollableStyle(false)).toContain("margin: -1em -32px -0.5em");
  });

  it("R15 gives code blocks a thin scrollbar in the surface tone", () => {
    const css = codeScrollbarStyle(dark);

    expect(css).toContain("scrollbar-width: thin");
    expect(css).toContain(
      `scrollbar-color: ${dark.scrollbarThumb} ${dark.codeBackground}`
    );
  });
});
