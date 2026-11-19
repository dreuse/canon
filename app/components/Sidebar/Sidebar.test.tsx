import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import stores from "~/stores";
import Sidebar from "./Sidebar";

const SEPARATOR_NAME = "Resize sidebar";
const DRAGGED_TO = 400;
const RESIZED_WIDTH = 380;

function renderSidebar({ drawer = false } = {}) {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <Sidebar showAccountMenu={false} drawer={drawer}>
            <div />
          </Sidebar>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function getSeparator() {
  return screen.getByRole("separator", { name: SEPARATOR_NAME });
}

function querySeparator() {
  return screen.queryByRole("separator", { name: SEPARATOR_NAME });
}

describe("Sidebar resize", () => {
  beforeEach(() => {
    stores.ui.set({
      sidebarWidth: light.sidebarWidth,
      sidebarCollapsed: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("exposes the edge as a vertical separator with the width bounds", () => {
    renderSidebar();
    const separator = getSeparator();

    expect(separator.getAttribute("aria-orientation")).toBe("vertical");
    expect(separator.getAttribute("tabindex")).toBe("0");
    expect(separator.getAttribute("aria-valuenow")).toBe(
      String(light.sidebarWidth)
    );
    expect(separator.getAttribute("aria-valuemin")).toBe(
      String(light.sidebarResizeMinWidth)
    );
    expect(separator.getAttribute("aria-valuemax")).toBe(
      String(light.sidebarMaxWidth)
    );
    expect(separator.querySelector("[data-grip]")).not.toBeNull();
  });

  it("follows the pointer while dragging and applies the width to the sidebar", () => {
    renderSidebar();

    fireEvent.mouseDown(getSeparator(), { clientX: light.sidebarWidth });
    fireEvent.mouseMove(document, { clientX: DRAGGED_TO });
    fireEvent.mouseUp(document);

    expect(stores.ui.sidebarWidth).toBe(DRAGGED_TO);
    expect(document.getElementById("sidebar")?.style.width).toBe(
      `${DRAGGED_TO}px`
    );
  });

  it("settles a drag past the maximum at the maximum", () => {
    renderSidebar();

    fireEvent.mouseDown(getSeparator(), { clientX: light.sidebarWidth });
    fireEvent.mouseMove(document, { clientX: light.sidebarMaxWidth * 2 });
    fireEvent.mouseUp(document);

    expect(stores.ui.sidebarWidth).toBe(light.sidebarMaxWidth);
  });

  it("grows and shrinks with the arrow keys within the bounds", () => {
    renderSidebar();
    const separator = getSeparator();
    const start = stores.ui.sidebarWidth;

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    const grown = stores.ui.sidebarWidth;
    expect(grown).toBeGreaterThan(start);

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(stores.ui.sidebarWidth).toBe(start);

    stores.ui.set({ sidebarWidth: light.sidebarMaxWidth });
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(stores.ui.sidebarWidth).toBe(light.sidebarMaxWidth);
  });

  it("resets to the default width on double click", () => {
    stores.ui.set({ sidebarWidth: RESIZED_WIDTH });
    renderSidebar();

    fireEvent.doubleClick(getSeparator());

    expect(stores.ui.sidebarWidth).toBe(light.sidebarWidth);
  });

  it("renders no separator when collapsed to the rail or shown as a drawer", () => {
    const { unmount } = renderSidebar();
    expect(querySeparator()).not.toBeNull();
    unmount();

    stores.ui.set({ sidebarCollapsed: true });
    const collapsed = renderSidebar();
    expect(querySeparator()).toBeNull();
    collapsed.unmount();

    stores.ui.set({ sidebarCollapsed: false });
    renderSidebar({ drawer: true });
    expect(querySeparator()).toBeNull();
  });
});
