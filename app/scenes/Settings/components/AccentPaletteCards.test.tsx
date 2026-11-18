import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import i18n from "i18next";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import { formatRatio, whiteOnFillRatio } from "@shared/styles/customAccent";
import type { Palette } from "@shared/styles/palettes";
import {
  checkedPaletteName,
  palettes,
  paletteToCustomTheme,
  resolveAccent,
} from "@shared/styles/palettes";
import type { CustomTheme } from "@shared/types";
import { buildDarkTheme, buildLightTheme, light } from "@shared/styles/theme";
import {
  AccentPalettePreview,
  AccentPaletteCards,
  PREVIEW_PRIMARY_TEST_ID,
} from "./AccentPaletteCards";

const HEADING_ID = "accent-heading";
const PT_BR = "pt-BR";
const EN_US = "en-US";

const NAMES: Record<Palette["name"], string> = {
  violet: "Violet",
  blue: "Blue",
  graphite: "Graphite",
  teal: "Teal",
  clay: "Clay",
  crimson: "Crimson",
};

const radios = () => screen.getAllByRole("radio");

function Harness({ initial }: { initial?: Palette["name"] }) {
  const [custom, setCustom] = React.useState<Partial<CustomTheme> | undefined>(
    () => {
      const start = palettes.find((p) => p.name === initial);
      return start ? paletteToCustomTheme(start) : undefined;
    }
  );
  const accent = (isDark: boolean) => resolveAccent(custom, isDark);

  return (
    <ThemeProvider theme={light}>
      <h2 id={HEADING_ID}>Accent color</h2>
      <AccentPaletteCards
        labelledBy={HEADING_ID}
        checked={checkedPaletteName(custom)}
        onSelect={(palette) => setCustom(paletteToCustomTheme(palette))}
      />
      <AccentPalettePreview
        lightTheme={buildLightTheme(accent(false))}
        darkTheme={buildDarkTheme(accent(true))}
      />
    </ThemeProvider>
  );
}

const primaryOf = (panelName: string) =>
  within(screen.getByRole("group", { name: panelName })).getByTestId(
    PREVIEW_PRIMARY_TEST_ID
  );

describe("AccentPaletteCards", () => {
  afterEach(async () => {
    cleanup();
    i18n.addResourceBundle(EN_US, "translation", {});
    await i18n.changeLanguage(EN_US);
  });

  it("R16 renders six named cards with computed contrast in pt-BR decimals", async () => {
    i18n.addResourceBundle(PT_BR, "translation", {});
    await i18n.changeLanguage(PT_BR);
    render(<Harness />);

    expect(
      screen.getByRole("radiogroup", { name: "Accent color" })
    ).toBeTruthy();
    expect(radios()).toHaveLength(6);

    palettes.forEach((palette) => {
      const lightRatio = formatRatio(
        whiteOnFillRatio(palette.light.fill),
        PT_BR
      );
      const darkRatio = formatRatio(whiteOnFillRatio(palette.dark.fill), PT_BR);
      expect(lightRatio).toContain(",");
      const card = screen.getByRole("radio", {
        name: NAMES[palette.name],
      });
      expect(card.textContent).toContain(
        `Button ${lightRatio}:1 in light · ${darkRatio}:1 in dark`
      );
    });
  });

  it("R16 sets aria-checked on the chosen card and clears the others", () => {
    render(<Harness initial="violet" />);
    const target = screen.getByRole("radio", { name: /^Teal$/ });

    fireEvent.click(target);

    expect(target.getAttribute("aria-checked")).toBe("true");
    expect(
      radios().filter((r) => r.getAttribute("aria-checked") === "true")
    ).toHaveLength(1);
  });

  it("R16 updates the preview in both themes before saving", () => {
    render(<Harness initial="violet" />);
    const teal = palettes.find((p) => p.name === "teal") as Palette;

    fireEvent.click(screen.getByRole("radio", { name: /^Teal$/ }));

    expect(primaryOf("Light theme").getAttribute("data-fill")).toBe(
      teal.light.fill
    );
    expect(primaryOf("Dark theme").getAttribute("data-fill")).toBe(
      teal.dark.fill
    );
    expect(getComputedStyle(primaryOf("Dark theme")).backgroundColor).not.toBe(
      getComputedStyle(primaryOf("Light theme")).backgroundColor
    );
  });

  it("R16 checks no card for a custom accent", () => {
    render(
      <ThemeProvider theme={light}>
        <AccentPaletteCards
          labelledBy={HEADING_ID}
          checked={undefined}
          onSelect={() => undefined}
        />
      </ThemeProvider>
    );

    expect(
      radios().every((r) => r.getAttribute("aria-checked") === "false")
    ).toBe(true);
  });

  it("R16 moves focus with arrows and selects with Space", () => {
    render(<Harness initial="violet" />);
    const [first, second] = radios();

    expect(first.getAttribute("tabindex")).toBe("0");
    expect(second.getAttribute("tabindex")).toBe("-1");

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute("aria-checked")).toBe("false");

    fireEvent.keyDown(second, { key: "ArrowLeft" });
    fireEvent.keyDown(first, { key: "ArrowUp" });
    expect(document.activeElement).toBe(radios()[5]);

    fireEvent.click(document.activeElement as HTMLElement);
    expect(radios()[5].getAttribute("aria-checked")).toBe("true");
  });

  it("R16 derives the checked card: none for a custom pair, violet by default, the preset otherwise", () => {
    expect(
      checkedPaletteName({
        accent: "#123456",
        accentText: "#FFFFFF",
        accentDark: "#abcdef",
        accentTextDark: "#000000",
      })
    ).toBeUndefined();
    expect(checkedPaletteName(undefined)).toBe("violet");
    expect(checkedPaletteName({})).toBe("violet");
    palettes.forEach((palette) => {
      expect(checkedPaletteName(paletteToCustomTheme(palette))).toBe(
        palette.name
      );
    });
  });
});
