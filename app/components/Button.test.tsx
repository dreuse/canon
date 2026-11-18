import { render, screen } from "@testing-library/react";
import { getContrast, parseToRgb } from "polished";
import { ThemeProvider } from "styled-components";
import { buildDarkTheme } from "@shared/styles/theme";
import Button from "~/components/Button";
import { ActionContextProvider } from "~/hooks/useActionContext";

const MIN_TEXT_CONTRAST = 4.5;

describe("Button", () => {
  it("R01 renders the danger button outlined in the danger colour", () => {
    const theme = buildDarkTheme({});
    render(
      <ThemeProvider theme={theme}>
        <ActionContextProvider>
          <Button danger>Delete</Button>
        </ActionContextProvider>
      </ThemeProvider>
    );

    const style = getComputedStyle(screen.getByRole("button"));

    const { red, green, blue } = parseToRgb(theme.danger);

    expect(style.color).toBe(`rgb(${red}, ${green}, ${blue})`);
    expect(style.background).not.toContain(`${red}, ${green}, ${blue}`);
    expect(style.background).toMatch(/transparent|rgba\(0, 0, 0, 0\)/);
  });

  it("R01 keeps danger text at 4.5:1 on the dark dialog surface", () => {
    const theme = buildDarkTheme({});

    expect(
      getContrast(theme.danger, theme.modalBackground)
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
