import {
  contrastRatio,
  formatHex,
  oklchToRgbInGamut,
  parseHex,
  relativeLuminance,
  rgbToOklch,
} from "./oklch";

/**
 * WCAG 1.4.11 asks for 3:1 on non-text graphics. The margin absorbs the
 * rounding back to 8 bits, which would otherwise land on 2.99:1.
 */
const MIN_CONTRAST = 3.05;

const STEP = 0.002;

const MAX_STEPS = 250;

const LIGHT_BACKGROUND_LUMINANCE = 0.18;

const cache = new Map<string, string>();

/**
 * Adapts a user-chosen icon color to the theme it is painted on. The stored
 * color never changes: only lightness moves, in OKLCH, until the contrast ratio
 * against the background crosses 3:1. Hue and chroma are preserved, so green
 * stays green rather than becoming grey, and a color that already passes is
 * returned unchanged.
 *
 * @param input the color chosen by the user, or `currentColor`.
 * @param background the background the icon sits on, usually `theme.background`.
 * @returns a hex color that reaches 3:1, or the input when it cannot be read.
 */
export function resolveIconColor(input: string, background: string): string {
  if (!input || input === "currentColor") {
    return input;
  }

  const key = `${input}|${background}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }

  const result = compute(input, background);
  cache.set(key, result);
  return result;
}

function compute(input: string, background: string): string {
  const rgb = parseHex(input);
  const backgroundRgb = parseHex(background);

  if (!rgb || !backgroundRgb) {
    return input;
  }

  if (contrastRatio(input, background) >= MIN_CONTRAST) {
    return input;
  }

  const color = rgbToOklch(rgb);
  const lighten = relativeLuminance(backgroundRgb) < LIGHT_BACKGROUND_LUMINANCE;

  for (let i = 1; i <= MAX_STEPS; i++) {
    const L = color.L + (lighten ? i : -i) * STEP;
    if (L < 0 || L > 1) {
      break;
    }
    const candidate = formatHex(oklchToRgbInGamut({ ...color, L }));
    if (contrastRatio(candidate, background) >= MIN_CONTRAST) {
      return candidate;
    }
  }

  return lighten ? "#FFFFFF" : "#000000";
}
