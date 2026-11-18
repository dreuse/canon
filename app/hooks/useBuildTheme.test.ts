import { renderHook } from "@testing-library/react";
import { Theme } from "~/stores/UiStore";
import useBuildTheme from "./useBuildTheme";

vi.mock("./useStores", () => ({
  default: () => ({
    ui: { resolvedTheme: "dark", setThemeOverride: () => {} },
  }),
}));

vi.mock("./useQuery", () => ({
  default: () => new URLSearchParams(),
}));

const PHONE_WIDTH = 390;
const DARK_BACKGROUND = "#23252C";

const matchesWidthQueries = (query: string) => {
  const max = /max-width:\s*(\d+)px/.exec(query);
  return max ? PHONE_WIDTH <= Number(max[1]) : false;
};

describe("useBuildTheme", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("R12 keeps the desktop dark background on a 390px viewport", () => {
    window.matchMedia = (query: string) =>
      Object.assign(originalMatchMedia(query), {
        matches: matchesWidthQueries(query),
      });

    const { result } = renderHook(() => useBuildTheme({}, Theme.Dark));

    expect(result.current.background).toBe(DARK_BACKGROUND);
  });
});
