import { getLuminance } from "polished";
import type { CustomTheme } from "../types";

export type PaletteName =
  | "blue"
  | "graphite"
  | "teal"
  | "violet"
  | "clay"
  | "crimson";

export type Palette = {
  name: PaletteName;
  accent: string;
  accentDark: string;
};

const LUMINANCE_MIDPOINT = 0.4;

const DARK_ACCENT_TEXT = "#08090C";

const LIGHT_ACCENT_TEXT = "#FFFFFF";

export const accentTextFor = (accent: string): string =>
  getLuminance(accent) > LUMINANCE_MIDPOINT
    ? DARK_ACCENT_TEXT
    : LIGHT_ACCENT_TEXT;

export const palettes: Palette[] = [
  { name: "blue", accent: "#0366d6", accentDark: "#4c9aff" },
  { name: "graphite", accent: "#3f4650", accentDark: "#9aa6b8" },
  { name: "teal", accent: "#0f7b6c", accentDark: "#3fc7ae" },
  { name: "violet", accent: "#6b46c1", accentDark: "#a78bfa" },
  { name: "clay", accent: "#a35b1e", accentDark: "#e0964a" },
  { name: "crimson", accent: "#b02a4a", accentDark: "#f4718e" },
];

export const paletteToCustomTheme = (palette: Palette): CustomTheme => ({
  accent: palette.accent,
  accentText: accentTextFor(palette.accent),
  accentDark: palette.accentDark,
  accentTextDark: accentTextFor(palette.accentDark),
});

export const resolveAccent = (
  custom: Partial<CustomTheme> | undefined,
  isDark: boolean
): Partial<CustomTheme> => {
  if (!custom) {
    return {};
  }

  const accent = isDark ? (custom.accentDark ?? custom.accent) : custom.accent;
  const accentText = isDark
    ? (custom.accentTextDark ??
      (custom.accentDark ? accentTextFor(custom.accentDark) : undefined) ??
      custom.accentText)
    : custom.accentText;

  const resolved: Partial<CustomTheme> = {};
  if (accent) {
    resolved.accent = accent;
  }
  if (accentText) {
    resolved.accentText = accentText;
  }
  return resolved;
};

export const MIN_ACCENT_CONTRAST = 4.5;

const LIGHT_BACKGROUND = "#FFFFFF";

const DARK_BACKGROUND = "#111319";

const contrastRatio = (a: string, b: string): number => {
  const la = getLuminance(a);
  const lb = getLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

export const accentContrast = (accent: string, isDark: boolean): number =>
  contrastRatio(accent, isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND);

export const isAccentLegible = (accent: string, isDark: boolean): boolean =>
  accentContrast(accent, isDark) >= MIN_ACCENT_CONTRAST;
