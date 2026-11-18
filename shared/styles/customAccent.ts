import { getLuminance, hsl, parseToHsl } from "polished";

export const MIN_ACCENT_CONTRAST = 4.5;

export const ON_ACCENT = "#FFFFFF";

export const LIGHT_BACKGROUND = "#FFFFFF";

export const DARK_BACKGROUND = "#23252C";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const LIGHTNESS_STEP = 0.005;

const RATIO_SCALE = 10;

export interface AccentCheck {
  isValid: boolean;
  passes: boolean;
  ratio: number;
  suggestion: string;
  suggestionRatio: number;
  linkTone: string;
  linkRatio: number;
}

/**
 * Measures the WCAG contrast ratio between two colors.
 *
 * @param a the first color.
 * @param b the second color.
 * @returns the ratio, from 1 to 21.
 */
export const contrastRatio = (a: string, b: string): number => {
  const la = getLuminance(a);
  const lb = getLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * Measures white text on an accent fill.
 *
 * @param fill the fill color as a hex string.
 * @returns the contrast ratio of white on the fill.
 */
export const whiteOnFillRatio = (fill: string): number =>
  contrastRatio(ON_ACCENT, fill);

const walkLightness = (
  color: string,
  direction: 1 | -1,
  isDone: (candidate: string) => boolean
): string => {
  const { hue, saturation, lightness } = parseToHsl(color);
  let current = color;
  for (
    let next = lightness;
    next >= 0 && next <= 1 && !isDone(current);
    next += direction * LIGHTNESS_STEP
  ) {
    current = hsl(
      hue,
      saturation,
      Math.min(1, Math.max(0, next))
    ).toUpperCase();
  }
  return current;
};

/**
 * Finds the closest tone that keeps white text at the minimum contrast. It
 * keeps the hue and saturation and lowers the lightness.
 *
 * @param fill the fill color as a hex string.
 * @returns the fill itself when it passes, else the lightest passing tone.
 */
export const nearestPassingTone = (fill: string): string =>
  walkLightness(
    fill,
    -1,
    (candidate) => whiteOnFillRatio(candidate) >= MIN_ACCENT_CONTRAST
  );

/**
 * Generates the link tone for a dark theme fill. It keeps the hue and
 * saturation and raises the lightness until the tone reads on the dark page.
 *
 * @param fill the dark theme fill as a hex string.
 * @returns the fill itself when it already reads, else a lighter tone.
 */
export const darkLinkTone = (fill: string): string =>
  walkLightness(
    fill,
    1,
    (candidate) =>
      contrastRatio(candidate, DARK_BACKGROUND) >= MIN_ACCENT_CONTRAST
  );

/**
 * Checks a custom accent value for one theme.
 *
 * @param value the value typed by the admin.
 * @param isDark whether the value is for the dark theme.
 * @returns the validity, the measured ratio, the nearest passing tone and the link tone.
 */
export const checkAccent = (value: string, isDark: boolean): AccentCheck => {
  if (!HEX_COLOR.test(value)) {
    return {
      isValid: false,
      passes: false,
      ratio: 0,
      suggestion: value,
      suggestionRatio: 0,
      linkTone: value,
      linkRatio: 0,
    };
  }
  const ratio = whiteOnFillRatio(value);
  const suggestion = nearestPassingTone(value);
  const linkTone = isDark ? darkLinkTone(suggestion) : suggestion;
  return {
    isValid: true,
    passes: ratio >= MIN_ACCENT_CONTRAST,
    ratio,
    suggestion,
    suggestionRatio: whiteOnFillRatio(suggestion),
    linkTone,
    linkRatio: contrastRatio(
      linkTone,
      isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND
    ),
  };
};

/**
 * Formats a contrast ratio with one decimal, rounded down so that 4.47 never
 * reads as 4.5.
 *
 * @param ratio the contrast ratio.
 * @param locale the BCP 47 locale used for the decimal separator.
 * @returns the formatted ratio.
 */
export const formatRatio = (ratio: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.floor(ratio * RATIO_SCALE) / RATIO_SCALE);
