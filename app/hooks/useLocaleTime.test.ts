import { renderHook } from "@testing-library/react";
import { useLocaleTime } from "./useLocaleTime";

let mockLocale = "en_US";

vi.mock("~/hooks/useUserLocale", () => ({
  default: () => mockLocale,
}));

const DATE_TIME = "2026-11-18T12:00:00Z";

const render = (locale: string) => {
  mockLocale = locale;
  return renderHook(() =>
    useLocaleTime({ dateTime: DATE_TIME, relative: false })
  ).result.current;
};

describe("useLocaleTime", () => {
  it("R14 formats the long date in pt-BR", () => {
    const { content, tooltipContent } = render("pt_BR");

    expect(content).toBe("18 de novembro de 2026, 12:00");
    expect(tooltipContent).toBe("18 de novembro de 2026, 12:00");
  });

  it("R14 keeps the English long date", () => {
    expect(render("en_US").content).toBe("November 18th, 2026 12:00 PM");
  });

  it("R14 does not change fr_FR and de_DE", () => {
    expect(render("fr_FR").content).toBe("Le 18 novembre 2026 à 12:00");
    expect(render("de_DE").content).toBe("18. November 2026 um 12:00");
  });
});
