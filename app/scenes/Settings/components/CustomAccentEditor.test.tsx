import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { ThemeProvider } from "styled-components";
import { checkAccent } from "@shared/styles/customAccent";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import {
  AccentSaveBar,
  CustomAccentEditor,
  getAccentFills,
} from "./CustomAccentEditor";

const PASSING_LIGHT = "#0366D6";
const FAILING_DARK = "#4C9AFF";
const PASSING_SUGGESTION = checkAccent(FAILING_DARK, true).suggestion;

const saveButton = () =>
  screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" });

function Harness({ lightValue = PASSING_LIGHT, darkValue = FAILING_DARK }) {
  const [lightFill, setLightFill] = React.useState(lightValue);
  const [darkFill, setDarkFill] = React.useState(darkValue);

  return (
    <ThemeProvider theme={light}>
      <ActionContextProvider>
        <CustomAccentEditor
          light={lightFill}
          dark={darkFill}
          lightCheck={checkAccent(lightFill, false)}
          darkCheck={checkAccent(darkFill, true)}
          onLightChange={setLightFill}
          onDarkChange={setDarkFill}
        />
        <AccentSaveBar
          isDirty
          isSaving={false}
          accentLabel="Custom"
          lightCheck={checkAccent(lightFill, false)}
          darkCheck={checkAccent(darkFill, true)}
          onDiscard={() => undefined}
        />
      </ActionContextProvider>
    </ThemeProvider>
  );
}

describe("CustomAccentEditor", () => {
  it("R16 R19 blocks Save at 2.8:1 and enables it after using the suggested tone", () => {
    render(<Harness />);

    expect(saveButton().disabled).toBe(true);
    expect(screen.queryByText("Cannot save yet")).not.toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: `Use ${PASSING_SUGGESTION}` })
    );

    expect(saveButton().disabled).toBe(false);
    expect(screen.queryByText("Unsaved changes")).not.toBeNull();
  });

  it("R16 shows the measured ratio and marks the failing input invalid", () => {
    render(<Harness />);

    expect(screen.getByRole("alert").textContent).toContain(
      `White text on ${FAILING_DARK} is 2.8:1`
    );
    expect(
      screen.getByLabelText("Accent · dark theme").getAttribute("aria-invalid")
    ).toBe("true");
    expect(
      screen.getByLabelText("Accent · light theme").getAttribute("aria-invalid")
    ).toBe("false");
  });

  it("R16 blocks Save for an invalid hex and names the reason", () => {
    render(<Harness darkValue="#2F6FDB" />);

    fireEvent.change(screen.getByLabelText("Accent · light theme"), {
      target: { value: "#12" },
    });

    expect(saveButton().disabled).toBe(true);
    expect(
      screen.getByLabelText("Accent · light theme").getAttribute("aria-invalid")
    ).toBe("true");
  });

  it("R16 names both themes when both values fail", () => {
    render(<Harness lightValue="#6BA3FF" />);

    expect(
      screen.queryByText(
        "The light and dark theme accents are below the minimum contrast."
      )
    ).not.toBeNull();
  });

  it("R16 R19 draws the disabled Save button faded whatever the accent", () => {
    render(<Harness />);

    expect(window.getComputedStyle(saveButton()).opacity).toBe("0.45");
  });
});

describe("getAccentFills", () => {
  const typedPair = { accent: PASSING_LIGHT, accentDark: FAILING_DARK };

  it("R16 shows the typed dark value that matches a stored palette pair", () => {
    const fills = getAccentFills(typedPair, typedPair, true);

    expect(fills.dark).toBe(FAILING_DARK);
    expect(checkAccent(fills.dark, true).passes).toBe(false);
  });

  it("R16 shows the tuned fills of a stored palette before any edit", () => {
    const fills = getAccentFills(typedPair, typedPair, false);

    expect(fills.dark).not.toBe(FAILING_DARK);
    expect(checkAccent(fills.dark, true).passes).toBe(true);
  });

  it("R16 shows the default palette fills when no accent is saved", () => {
    const fills = getAccentFills({}, {}, false);

    expect(checkAccent(fills.light, false).passes).toBe(true);
    expect(checkAccent(fills.dark, true).passes).toBe(true);
  });
});
