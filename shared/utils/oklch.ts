export type Oklch = { L: number; C: number; H: number };

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.001 && v <= 1.001);

/**
 * Parses a hex color into channels.
 *
 * @param input a `#RGB` or `#RRGGBB` string.
 * @returns the red, green and blue channels in 0..1, or `null` when the input
 * is not hex.
 */
export function parseHex(input: string): [number, number, number] | null {
  const hex = input.trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    return null;
  }
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  return [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

/**
 * Formats channels as an uppercase hex color.
 *
 * @param rgb the red, green and blue channels in 0..1.
 * @returns a `#RRGGBB` string.
 */
export function formatHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(clamp01(v) * 255)
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()
      )
      .join("")
  );
}

/**
 * Converts sRGB to OKLCH, using Björn Ottosson's OKLab matrices.
 *
 * @param rgb the red, green and blue channels in 0..1.
 * @returns the lightness, chroma and hue.
 */
export function rgbToOklch([R, G, B]: [number, number, number]): Oklch {
  const r = srgbToLinear(R);
  const g = srgbToLinear(G);
  const b = srgbToLinear(B);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    C: Math.hypot(A, B2),
    H: Math.atan2(B2, A),
  };
}

/**
 * Converts OKLCH back to sRGB, without clipping to the gamut.
 *
 * @param color the lightness, chroma and hue.
 * @returns the red, green and blue channels, which may fall outside 0..1.
 */
export function oklchToRgb({ L, C, H }: Oklch): [number, number, number] {
  const A = C * Math.cos(H);
  const B2 = C * Math.sin(H);

  const l = (L + 0.3963377774 * A + 0.2158037573 * B2) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B2) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B2) ** 3;

  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * Converts OKLCH to sRGB, reducing chroma until the color fits the gamut so
 * that lightness and hue survive. Clipping the channels instead would shift
 * the hue of saturated colors.
 *
 * @param color the lightness, chroma and hue.
 * @returns the red, green and blue channels in 0..1.
 */
export function oklchToRgbInGamut(color: Oklch): [number, number, number] {
  let C = color.C;
  for (let i = 0; i < 120; i++) {
    const rgb = oklchToRgb({ ...color, C });
    if (inGamut(rgb)) {
      return rgb.map(clamp01) as [number, number, number];
    }
    C -= 0.004;
  }
  return oklchToRgb({ ...color, C: 0 }).map(clamp01) as [
    number,
    number,
    number,
  ];
}

/**
 * Calculates the WCAG relative luminance of a color.
 *
 * @param rgb the red, green and blue channels in 0..1.
 * @returns the relative luminance in 0..1.
 */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/**
 * Calculates the WCAG contrast ratio between two hex colors.
 *
 * @param a the first hex color.
 * @param b the second hex color.
 * @returns the ratio, from 1 to 21, or `1` when either color is not hex.
 */
export function contrastRatio(a: string, b: string): number {
  const rgbA = parseHex(a);
  const rgbB = parseHex(b);
  if (!rgbA || !rgbB) {
    return 1;
  }
  const yA = relativeLuminance(rgbA);
  const yB = relativeLuminance(rgbB);
  return (Math.max(yA, yB) + 0.05) / (Math.min(yA, yB) + 0.05);
}
