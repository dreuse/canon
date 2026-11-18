import { pickBy } from "es-toolkit";
import { useEffect, useMemo } from "react";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import type { ThemeOverride } from "@shared/styles/theme";
import { validateColorHex } from "@shared/utils/color";
import { Theme } from "~/stores/UiStore";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "./useStores";
import useQuery from "./useQuery";

/**
 * Builds a theme from the user's preference (system, light or dark), whether
 * the page is printing, and the custom theme provided.
 *
 * @param customTheme Custom theme to merge with the default theme
 * @param overrideTheme Optional override the theme to use
 * @returns The theme to use
 */
export default function useBuildTheme(
  customTheme: ThemeOverride = {},
  overrideTheme?: Theme
) {
  const { ui } = useStores();
  const params = useQuery();
  const isPrinting = useMediaQuery("print");
  const queryTheme = (params.get("theme") as Theme) || undefined;

  // Store the theme override in UiStore so it persists during navigation
  useEffect(() => {
    if (
      queryTheme &&
      (queryTheme === Theme.Light || queryTheme === Theme.Dark)
    ) {
      ui.setThemeOverride(queryTheme);
    }
  }, [queryTheme, ui]);

  const resolvedTheme = overrideTheme ?? ui.resolvedTheme;

  // Drop any stored color that is not valid hex so a bad value cannot break rendering.
  const safeTheme = useMemo(
    () =>
      pickBy(
        customTheme,
        (value, key) =>
          key === "fontFamily" ||
          key === "fontFamilyMono" ||
          (typeof value === "string" && validateColorHex(value))
      ),
    [customTheme]
  );

  const theme = useMemo(
    () =>
      isPrinting || resolvedTheme !== "dark"
        ? buildLightTheme(safeTheme)
        : buildDarkTheme(safeTheme),
    [safeTheme, isPrinting, resolvedTheme]
  );

  return theme;
}
