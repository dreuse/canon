import { parseToHsl } from "polished";
import {
  MIN_ACCENT_CONTRAST,
  DARK_BACKGROUND,
  contrastRatio,
  checkAccent,
  darkLinkTone,
  formatRatio,
  nearestPassingTone,
  whiteOnFillRatio,
} from "./customAccent";
import { resolveAccent } from "./palettes";

const FAILING_DARK = "#4C9AFF";
const BOARD_DARK_FILL = "#2F6FDB";
const BOARD_LIGHT_FILL = "#0366D6";
const HUE_TOLERANCE = 3;

describe("custom accent helpers", () => {
  it("R16 measures white text on the fill", () => {
    expect(whiteOnFillRatio(FAILING_DARK)).toBeCloseTo(2.8, 1);
    expect(whiteOnFillRatio(BOARD_DARK_FILL)).toBeCloseTo(4.8, 1);
  });

  it("R16 suggests a passing tone with the same hue for #4C9AFF in dark", () => {
    const tone = nearestPassingTone(FAILING_DARK);

    expect(whiteOnFillRatio(tone)).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
    expect(
      Math.abs(parseToHsl(tone).hue - parseToHsl(FAILING_DARK).hue)
    ).toBeLessThanOrEqual(HUE_TOLERANCE);
  });

  it("R16 returns a value that already passes unchanged", () => {
    expect(nearestPassingTone(BOARD_LIGHT_FILL)).toBe(BOARD_LIGHT_FILL);
  });

  it("R16 generates a lighter dark link tone that reads 4.5:1 on the dark page", () => {
    const tone = darkLinkTone(BOARD_DARK_FILL);

    expect(contrastRatio(tone, DARK_BACKGROUND)).toBeGreaterThanOrEqual(
      MIN_ACCENT_CONTRAST
    );
    expect(parseToHsl(tone).lightness).toBeGreaterThan(
      parseToHsl(BOARD_DARK_FILL).lightness
    );
  });

  it("R16 keeps a dark value that already reads 4.5:1 as its own link tone", () => {
    expect(darkLinkTone("#9AA6B8")).toBe("#9AA6B8");
  });

  it("R16 never rounds 4.47 up to 4.5", () => {
    expect(formatRatio(4.47, "en-US")).toBe("4.4");
    expect(formatRatio(4.47, "pt-BR")).toBe("4,4");
    expect(formatRatio(4.5, "pt-BR")).toBe("4,5");
  });

  it("R16 reports a failing dark value with a suggestion and link tone", () => {
    const check = checkAccent(FAILING_DARK, true);

    expect(check.isValid).toBe(true);
    expect(check.passes).toBe(false);
    expect(whiteOnFillRatio(check.suggestion)).toBeGreaterThanOrEqual(
      MIN_ACCENT_CONTRAST
    );
    expect(check.linkRatio).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
  });

  it("R16 reports a passing light value", () => {
    const check = checkAccent(BOARD_LIGHT_FILL, false);

    expect(check.passes).toBe(true);
    expect(check.ratio).toBeCloseTo(5.4, 1);
  });

  it("R16 flags a malformed hex as invalid and not passing", () => {
    const check = checkAccent("#12", false);

    expect(check.isValid).toBe(false);
    expect(check.passes).toBe(false);
  });
});

describe("custom accent resolution", () => {
  it("R01 resolves a stored accent with no dark value to that accent in both themes", () => {
    const stored = { accent: "#123456" };

    expect(resolveAccent(stored, false).accent).toBe("#123456");
    expect(resolveAccent(stored, true).accent).toBe("#123456");
  });

  it("R16 uses a generated lighter tone for the dark link of a custom dark value", () => {
    const resolved = resolveAccent(
      { accent: "#123456", accentDark: BOARD_DARK_FILL },
      true
    );

    expect(resolved.accent).toBe(BOARD_DARK_FILL);
    expect(resolved.link).toBe(darkLinkTone(BOARD_DARK_FILL));
    expect(resolved.selected).toBe(resolved.link);
    expect(contrastRatio(resolved.link ?? "", DARK_BACKGROUND)).toBeGreaterThan(
      MIN_ACCENT_CONTRAST
    );
  });

  it("R16 keeps a legacy dark value that already reads 4.5:1 as its link", () => {
    const resolved = resolveAccent(
      { accent: "#123456", accentDark: "#9AA6B8" },
      true
    );

    expect(resolved.link).toBe("#9AA6B8");
  });
});
