import { getContrast } from "polished";
import { buildDarkTheme, buildLightTheme } from "./theme";
import {
  MIN_ACCENT_CONTRAST,
  accentContrast,
  getPalette,
  isAccentLegible,
  palettes,
  type Palette,
  paletteToCustomTheme,
  resolveAccent,
} from "./palettes";

interface Tones {
  fill: string;
  hover: string;
  text: string;
  focus: string;
}

const BOARD: Record<string, { dark: Tones; light: Tones }> = {
  blue: {
    dark: {
      fill: "#2F6FDB",
      hover: "#2A64C5",
      text: "#5EA4FF",
      focus: "#5EA4FF",
    },
    light: {
      fill: "#0366D6",
      hover: "#035CC1",
      text: "#0364D2",
      focus: "#0366D6",
    },
  },
  graphite: {
    dark: {
      fill: "#5A6371",
      hover: "#515966",
      text: "#9aa6b8",
      focus: "#9aa6b8",
    },
    light: {
      fill: "#3F4650",
      hover: "#393F48",
      text: "#3F4650",
      focus: "#3F4650",
    },
  },
  teal: {
    dark: {
      fill: "#16806F",
      hover: "#147364",
      text: "#3fc7ae",
      focus: "#3fc7ae",
    },
    light: {
      fill: "#0F7B6C",
      hover: "#0E6F61",
      text: "#0E7668",
      focus: "#0F7B6C",
    },
  },
  violet: {
    dark: {
      fill: "#6D4ED6",
      hover: "#6246C1",
      text: "#AB90FA",
      focus: "#AB90FA",
    },
    light: {
      fill: "#6B46C1",
      hover: "#603FAE",
      text: "#6B46C1",
      focus: "#6B46C1",
    },
  },
  clay: {
    dark: {
      fill: "#A35B1E",
      hover: "#93521B",
      text: "#e0964a",
      focus: "#e0964a",
    },
    light: {
      fill: "#A35B1E",
      hover: "#93521B",
      text: "#9C571D",
      focus: "#A35B1E",
    },
  },
  crimson: {
    dark: {
      fill: "#B8334F",
      hover: "#A62E47",
      text: "#F57A95",
      focus: "#F57A95",
    },
    light: {
      fill: "#B02A4A",
      hover: "#9E2643",
      text: "#B02A4A",
      focus: "#B02A4A",
    },
  },
};

const WHITE = "#FFFFFF";

const lowerTones = (tones: Tones): Tones => ({
  fill: tones.fill.toLowerCase(),
  hover: tones.hover.toLowerCase(),
  text: tones.text.toLowerCase(),
  focus: tones.focus.toLowerCase(),
});

describe("accent palettes", () => {
  it("R01 holds the six palettes", () => {
    expect(palettes.map((palette) => palette.name)).toEqual(Object.keys(BOARD));
  });

  describe.each(Object.keys(BOARD))("%s", (name) => {
    let palette: Palette;

    beforeAll(() => {
      palette = getPalette(name);
    });

    it(`R01 dark ${name} uses the board fill, hover, text and focus`, () => {
      expect(lowerTones(palette.dark)).toEqual(lowerTones(BOARD[name].dark));
    });

    it(`R01 light ${name} uses the board fill, hover, text and focus`, () => {
      expect(lowerTones(palette.light)).toEqual(lowerTones(BOARD[name].light));
    });

    it(`R01 white on ${name} fills and text tones pass ${MIN_ACCENT_CONTRAST}:1 in both themes`, () => {
      expect(accentContrast(palette.light.fill, false)).toBeGreaterThanOrEqual(
        MIN_ACCENT_CONTRAST
      );
      expect(accentContrast(palette.light.text, false)).toBeGreaterThanOrEqual(
        MIN_ACCENT_CONTRAST
      );
      expect(accentContrast(palette.dark.text, true)).toBeGreaterThanOrEqual(
        MIN_ACCENT_CONTRAST
      );
    });

    it(`R01 white text on the dark ${name} fill passes ${MIN_ACCENT_CONTRAST}:1`, () => {
      expect(getContrast(WHITE, palette.dark.fill)).toBeGreaterThanOrEqual(
        MIN_ACCENT_CONTRAST
      );
    });

    it(`R01 light ${name} maps fill to buttons and text tone to links and focus`, () => {
      const theme = buildLightTheme(
        resolveAccent(paletteToCustomTheme(palette), false)
      );
      expect(theme.accent.toLowerCase()).toBe(palette.light.fill.toLowerCase());
      expect(theme.accentHover.toLowerCase()).toBe(
        palette.light.hover.toLowerCase()
      );
      expect(theme.link.toLowerCase()).toBe(palette.light.text.toLowerCase());
      expect(theme.selected.toLowerCase()).toBe(
        palette.light.focus.toLowerCase()
      );
      expect(theme.accentText.toLowerCase()).toBe("#ffffff");
    });

    it(`R01 dark ${name} maps fill to buttons and text tone to links and focus`, () => {
      const theme = buildDarkTheme(
        resolveAccent(paletteToCustomTheme(palette), true)
      );
      expect(theme.accent.toLowerCase()).toBe(palette.dark.fill.toLowerCase());
      expect(theme.accentHover.toLowerCase()).toBe(
        palette.dark.hover.toLowerCase()
      );
      expect(theme.link.toLowerCase()).toBe(palette.dark.text.toLowerCase());
      expect(theme.selected.toLowerCase()).toBe(
        palette.dark.focus.toLowerCase()
      );
      expect(theme.accentText.toLowerCase()).toBe("#ffffff");
    });
  });

  it("R01 measures the dark text tone against #23252C", () => {
    expect(accentContrast("#FFFFFF", true)).toBeCloseTo(15.2, 1);
    expect(accentContrast("#23252C", true)).toBeCloseTo(1, 5);
  });

  it("R01 measures the light text tone against #FFFFFF", () => {
    expect(accentContrast("#FFFFFF", false)).toBeCloseTo(1, 5);
    expect(accentContrast("#000000", false)).toBeCloseTo(21, 5);
  });

  it("R01 stores the light fill and the dark text tone for every preset", () => {
    for (const palette of palettes) {
      const stored = paletteToCustomTheme(palette);
      expect(stored.accent).toBe(palette.light.fill);
      expect(stored.accentDark).toBe(palette.dark.text);
    }
  });

  it("R01 stored preset values pass the Appearance save check in both themes", () => {
    for (const palette of palettes) {
      const stored = paletteToCustomTheme(palette);
      expect(isAccentLegible(stored.accent as string, false)).toBe(true);
      expect(isAccentLegible(stored.accentDark as string, true)).toBe(true);
    }
  });

  it.each(palettes.map((palette) => palette.name))(
    "R01 keeps legible dark button text after only the light accent of a %s preset changes",
    (name) => {
      const stored = {
        ...paletteToCustomTheme(getPalette(name)),
        accent: "#123456",
      };

      const dark = buildDarkTheme(resolveAccent(stored, true));

      expect(
        getContrast(dark.accentText, dark.accent)
      ).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
    }
  );

  it("R01 uses violet when no accent is saved", () => {
    const violet = getPalette("violet");
    const dark = buildDarkTheme(resolveAccent(undefined, true));
    const light = buildLightTheme(resolveAccent(undefined, false));

    expect(dark.accent.toLowerCase()).toBe(violet.dark.fill.toLowerCase());
    expect(dark.link.toLowerCase()).toBe(violet.dark.text.toLowerCase());
    expect(light.accent.toLowerCase()).toBe(violet.light.fill.toLowerCase());
    expect(light.link.toLowerCase()).toBe(violet.light.text.toLowerCase());
  });

  it("R01 falls back to violet for an unknown palette name", () => {
    expect(getPalette("magenta").name).toBe("violet");
    expect(getPalette(undefined).name).toBe("violet");
  });

  it("R01 resolves a legacy saved blue to the tuned blue pair", () => {
    const legacyBlue = {
      accent: "#0366d6",
      accentText: "#FFFFFF",
      accentDark: "#4c9aff",
      accentTextDark: "#08090C",
    };
    const blue = getPalette("blue");

    const dark = buildDarkTheme(resolveAccent(legacyBlue, true));
    const light = buildLightTheme(resolveAccent(legacyBlue, false));

    expect(dark.accent.toLowerCase()).toBe(blue.dark.fill.toLowerCase());
    expect(dark.link.toLowerCase()).toBe(blue.dark.text.toLowerCase());
    expect(dark.accentText.toLowerCase()).toBe("#ffffff");
    expect(light.accent.toLowerCase()).toBe(blue.light.fill.toLowerCase());
    expect(light.link.toLowerCase()).toBe(blue.light.text.toLowerCase());
  });

  it("R01 still renders a saved custom accent", () => {
    const custom = {
      accent: "#123456",
      accentText: "#FFFFFF",
      accentDark: "#abcdef",
      accentTextDark: "#08090C",
    };

    const light = buildLightTheme(resolveAccent(custom, false));
    const dark = buildDarkTheme(resolveAccent(custom, true));

    expect(light.accent).toBe("#123456");
    expect(light.link).toBe("#123456");
    expect(light.accentText).toBe("#FFFFFF");
    expect(dark.accent).toBe("#abcdef");
    expect(dark.link).toBe("#abcdef");
    expect(dark.accentText).toBe("#08090C");
  });

  it("R01 keeps a custom dark accent saved beside a preset light fill", () => {
    const custom = {
      accent: "#0366D6",
      accentText: "#FFFFFF",
      accentDark: "#FFAA00",
      accentTextDark: "#08090C",
    };
    const blue = getPalette("blue");

    const dark = buildDarkTheme(resolveAccent(custom, true));
    const light = buildLightTheme(resolveAccent(custom, false));

    expect(dark.accent).toBe("#FFAA00");
    expect(dark.link).toBe("#FFAA00");
    expect(dark.selected).toBe("#FFAA00");
    expect(dark.accentText).toBe("#08090C");
    expect(light.accent.toLowerCase()).toBe(blue.light.fill.toLowerCase());
    expect(light.link.toLowerCase()).toBe(blue.light.text.toLowerCase());
  });

  it.each(
    palettes.map((palette) => [palette.name, palette.dark.text] as const)
  )(
    "R01 resolves a saved %s with its dark text tone to the tuned pair",
    (name, darkText) => {
      const palette = getPalette(name);
      const stored = { accent: palette.light.fill, accentDark: darkText };

      const dark = buildDarkTheme(resolveAccent(stored, true));

      expect(dark.accent.toLowerCase()).toBe(palette.dark.fill.toLowerCase());
      expect(dark.link.toLowerCase()).toBe(palette.dark.text.toLowerCase());
    }
  );

  it("R01 resolves a saved light fill with no dark accent to the tuned pair", () => {
    const blue = getPalette("blue");
    const dark = buildDarkTheme(resolveAccent({ accent: "#0366d6" }, true));

    expect(dark.accent.toLowerCase()).toBe(blue.dark.fill.toLowerCase());
    expect(dark.link.toLowerCase()).toBe(blue.dark.text.toLowerCase());
  });

  it.each(
    Object.entries({
      blue: "#4c9aff",
      graphite: "#9aa6b8",
      teal: "#3fc7ae",
      violet: "#a78bfa",
      clay: "#e0964a",
      crimson: "#f4718e",
    })
  )(
    "R01 resolves a legacy saved %s dark accent to the tuned pair",
    (name, legacyDark) => {
      const palette = getPalette(name);
      const stored = {
        accent: palette.light.fill.toLowerCase(),
        accentDark: legacyDark.toUpperCase(),
      };

      const dark = buildDarkTheme(resolveAccent(stored, true));

      expect(dark.accent.toLowerCase()).toBe(palette.dark.fill.toLowerCase());
    }
  );

  it("R01 renders a dark-only saved accent in dark mode", () => {
    const stored = { accentDark: "#FFAA00", accentTextDark: "#08090C" };

    const dark = buildDarkTheme(resolveAccent(stored, true));

    expect(dark.accent).toBe("#FFAA00");
    expect(dark.link).toBe("#FFAA00");
    expect(dark.accentText).toBe("#08090C");
  });

  it("R01 uses violet in light mode when only a dark accent is saved", () => {
    const violet = getPalette("violet");
    const light = buildLightTheme(
      resolveAccent({ accentDark: "#FFAA00" }, false)
    );

    expect(light.accent.toLowerCase()).toBe(violet.light.fill.toLowerCase());
    expect(light.link.toLowerCase()).toBe(violet.light.text.toLowerCase());
  });

  it("R01 uses violet when the saved theme is empty", () => {
    const violet = getPalette("violet");
    const dark = buildDarkTheme(resolveAccent({}, true));

    expect(dark.accent.toLowerCase()).toBe(violet.dark.fill.toLowerCase());
  });

  it("R01 keeps the default dark link for a custom accent with no dark accent", () => {
    const stored = { accent: "#123456", accentText: "#FFFFFF" };

    const dark = buildDarkTheme(resolveAccent(stored, true));
    const light = buildLightTheme(resolveAccent(stored, false));

    expect(dark.accent).toBe("#123456");
    expect(dark.link).toBe("#5AA8FF");
    expect(light.link).toBe("#123456");
    expect(light.selected).toBe("#123456");
  });
});
