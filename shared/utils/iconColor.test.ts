import { colorPalette } from "../constants";
import { resolveIconColor } from "./iconColor";
import { contrastRatio } from "./oklch";

const LIGHT_BACKGROUND = "#FFFFFF";
const DARK_BACKGROUND = "#111319";

describe("resolveIconColor", () => {
  it.each([LIGHT_BACKGROUND, DARK_BACKGROUND])(
    "brings every preset to 3:1 against %s",
    (background) => {
      colorPalette.forEach((color) => {
        const resolved = resolveIconColor(color, background);
        expect(contrastRatio(resolved, background)).toBeGreaterThanOrEqual(3);
      });
    }
  );

  it("returns colors that already pass untouched", () => {
    expect(resolveIconColor("#0366D6", LIGHT_BACKGROUND)).toBe("#0366D6");
    expect(resolveIconColor("#2BC2FF", DARK_BACKGROUND)).toBe("#2BC2FF");
  });

  it("preserves hue instead of falling back to grey", () => {
    expect(resolveIconColor("#2F362F", DARK_BACKGROUND)).toBe("#5D655D");
    expect(resolveIconColor("#4E5C6E", DARK_BACKGROUND)).toBe("#566476");
    expect(resolveIconColor("#FFBE0B", LIGHT_BACKGROUND)).toBe("#BC8B0A");
  });

  it("lifts pure black off a dark background", () => {
    const resolved = resolveIconColor("#000000", DARK_BACKGROUND);
    expect(contrastRatio(resolved, DARK_BACKGROUND)).toBeGreaterThanOrEqual(3);
  });

  it("passes through values it cannot read", () => {
    expect(resolveIconColor("currentColor", DARK_BACKGROUND)).toBe(
      "currentColor"
    );
    expect(resolveIconColor("white", DARK_BACKGROUND)).toBe("white");
    expect(resolveIconColor("#2F362F", "var(--background)")).toBe("#2F362F");
  });
});
