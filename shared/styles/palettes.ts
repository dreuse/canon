import { getLuminance } from "polished";
import type { CustomTheme } from "../types";
import {
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  MIN_ACCENT_CONTRAST,
  ON_ACCENT,
  contrastRatio,
  darkLinkTone,
} from "./customAccent";

export { MIN_ACCENT_CONTRAST };

export type PaletteName =
  | "blue"
  | "graphite"
  | "teal"
  | "violet"
  | "clay"
  | "crimson";

export interface PaletteTones {
  fill: string;
  hover: string;
  text: string;
  focus: string;
}

export interface Palette {
  name: PaletteName;
  light: PaletteTones;
  dark: PaletteTones;
}

export interface AccentOverride {
  accent: string;
  accentText: string;
  accentHover?: string;
  link: string;
  selected: string;
}

const LUMINANCE_MIDPOINT = 0.179;

const DARK_ACCENT_TEXT = "#08090C";

const LIGHT_ACCENT_TEXT = "#FFFFFF";

export const accentTextFor = (accent: string): string =>
  getLuminance(accent) > LUMINANCE_MIDPOINT
    ? DARK_ACCENT_TEXT
    : LIGHT_ACCENT_TEXT;

const violetPalette: Palette = {
  name: "violet",
  light: {
    fill: "#6B46C1",
    hover: "#603FAE",
    text: "#6B46C1",
    focus: "#6B46C1",
  },
  dark: {
    fill: "#6D4ED6",
    hover: "#6246C1",
    text: "#AB90FA",
    focus: "#AB90FA",
  },
};

export const palettes: Palette[] = [
  {
    name: "blue",
    light: {
      fill: "#0366D6",
      hover: "#035CC1",
      text: "#0364D2",
      focus: "#0366D6",
    },
    dark: {
      fill: "#2F6FDB",
      hover: "#2A64C5",
      text: "#5EA4FF",
      focus: "#5EA4FF",
    },
  },
  {
    name: "graphite",
    light: {
      fill: "#3F4650",
      hover: "#393F48",
      text: "#3F4650",
      focus: "#3F4650",
    },
    dark: {
      fill: "#5A6371",
      hover: "#515966",
      text: "#9AA6B8",
      focus: "#9AA6B8",
    },
  },
  {
    name: "teal",
    light: {
      fill: "#0F7B6C",
      hover: "#0E6F61",
      text: "#0E7668",
      focus: "#0F7B6C",
    },
    dark: {
      fill: "#16806F",
      hover: "#147364",
      text: "#3FC7AE",
      focus: "#3FC7AE",
    },
  },
  violetPalette,
  {
    name: "clay",
    light: {
      fill: "#A35B1E",
      hover: "#93521B",
      text: "#9C571D",
      focus: "#A35B1E",
    },
    dark: {
      fill: "#A35B1E",
      hover: "#93521B",
      text: "#E0964A",
      focus: "#E0964A",
    },
  },
  {
    name: "crimson",
    light: {
      fill: "#B02A4A",
      hover: "#9E2643",
      text: "#B02A4A",
      focus: "#B02A4A",
    },
    dark: {
      fill: "#B8334F",
      hover: "#A62E47",
      text: "#F57A95",
      focus: "#F57A95",
    },
  },
];

/**
 * Finds a palette by name, falling back to the default violet palette.
 *
 * @param name the palette name to look up.
 * @returns the matching palette, or violet when the name is unknown.
 */
export const getPalette = (name: string | undefined): Palette =>
  palettes.find((palette) => palette.name === name) ?? violetPalette;

export const paletteToCustomTheme = (palette: Palette): CustomTheme => ({
  accent: palette.light.fill,
  accentText: ON_ACCENT,
  accentDark: palette.dark.text,
  accentTextDark: accentTextFor(palette.dark.text),
});

const tonesToOverride = (tones: PaletteTones): AccentOverride => ({
  accent: tones.fill,
  accentText: ON_ACCENT,
  accentHover: tones.hover,
  link: tones.text,
  selected: tones.focus,
});

const LEGACY_DARK_ACCENTS: Record<PaletteName, string> = {
  blue: "#4c9aff",
  graphite: "#9aa6b8",
  teal: "#3fc7ae",
  violet: "#a78bfa",
  clay: "#e0964a",
  crimson: "#f4718e",
};

const findPaletteByLightFill = (accent: string | undefined) =>
  palettes.find(
    (palette) => palette.light.fill.toLowerCase() === accent?.toLowerCase()
  );

const isPresetDarkAccent = (
  palette: Palette,
  accentDark: string | undefined
) => {
  if (!accentDark) {
    return true;
  }
  const dark = accentDark.toLowerCase();
  return (
    dark === palette.dark.text.toLowerCase() ||
    dark === LEGACY_DARK_ACCENTS[palette.name]
  );
};

/**
 * Finds the palette a saved custom theme represents.
 *
 * @param custom the saved custom theme, if any.
 * @returns the palette, or undefined when the theme is custom or empty.
 */
export const findSavedPalette = (
  custom: Partial<CustomTheme> | undefined
): Palette | undefined => {
  const palette = findPaletteByLightFill(custom?.accent);
  return palette && isPresetDarkAccent(palette, custom?.accentDark)
    ? palette
    : undefined;
};

/**
 * Names the palette card to show as chosen for a custom theme.
 *
 * @param custom the custom theme, if any.
 * @returns the default palette name when no accent is set, the preset name for a preset pair, or undefined for a custom pair.
 */
export const checkedPaletteName = (
  custom: Partial<CustomTheme> | undefined
): PaletteName | undefined =>
  custom?.accent ? findSavedPalette(custom)?.name : violetPalette.name;

/**
 * Resolves the accent tokens for a theme from the saved custom theme. A saved
 * palette resolves to its tuned pair, a custom accent renders as saved, and
 * a mode with no saved accent resolves to the default palette.
 *
 * @param custom the saved custom theme, if any.
 * @param isDark whether the resolved theme is dark.
 * @returns the accent overrides to apply to the theme.
 */
export const resolveAccent = (
  custom: Partial<CustomTheme> | undefined,
  isDark: boolean
): Partial<AccentOverride> => {
  const mode = isDark ? "dark" : "light";
  const accent = isDark
    ? (custom?.accentDark ?? custom?.accent)
    : custom?.accent;

  if (!custom || !accent) {
    return tonesToOverride(getPalette(undefined)[mode]);
  }

  const palette = findPaletteByLightFill(custom.accent);
  if (palette && (!isDark || isPresetDarkAccent(palette, custom.accentDark))) {
    return tonesToOverride(palette[mode]);
  }

  const accentText = isDark
    ? (custom.accentTextDark ??
      (custom.accentDark ? accentTextFor(custom.accentDark) : undefined) ??
      custom.accentText)
    : custom.accentText;
  const hasModeAccent = !isDark || Boolean(custom.accentDark);
  const linkTone = isDark ? darkLinkTone(accent) : accent;

  return {
    accent,
    ...(accentText ? { accentText } : {}),
    ...(hasModeAccent ? { link: linkTone, selected: linkTone } : {}),
  };
};

export const accentContrast = (accent: string, isDark: boolean): number =>
  contrastRatio(accent, isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND);

export const isAccentLegible = (accent: string, isDark: boolean): boolean =>
  accentContrast(accent, isDark) >= MIN_ACCENT_CONTRAST;
