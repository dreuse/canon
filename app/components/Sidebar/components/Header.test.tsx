import { render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import Storage from "@shared/utils/Storage";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { Header, getHeaderExpandedKey } from "./Header";

const SECTION_ID = "collections";
const SECTION_TITLE = "Collections";
const CHILD_LABEL = "Child row";
const CHILD_COUNT = 7;

function renderInApp(children: ReactNode) {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>{children}</ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function renderSection(props: { id?: string } = {}) {
  return renderInApp(
    <Header
      id={props.id}
      title={SECTION_TITLE}
      icon={<svg aria-hidden />}
      count={CHILD_COUNT}
    >
      <span>{CHILD_LABEL}</span>
    </Header>
  );
}

describe("Sidebar Header", () => {
  beforeEach(() => {
    Storage.remove(getHeaderExpandedKey(SECTION_ID));
  });

  it("shows the section title and its children when expanded", () => {
    renderSection({ id: SECTION_ID });

    expect(screen.getByRole("button", { name: SECTION_TITLE })).not.toBeNull();
    expect(screen.getByText(CHILD_LABEL)).not.toBeNull();
  });

  it("collapses to a navigation row carrying the count", () => {
    Storage.set(getHeaderExpandedKey(SECTION_ID), false);

    renderSection({ id: SECTION_ID });

    expect(screen.queryByText(CHILD_LABEL)).toBeNull();

    const row = screen.getByRole("button", {
      name: new RegExp(SECTION_TITLE),
    });
    expect(row.textContent).toContain(String(CHILD_COUNT));
  });

  it("does not offer a toggle without a section id", () => {
    Storage.set(getHeaderExpandedKey(SECTION_ID), false);

    renderSection();

    const button = screen.getByRole("button", { name: SECTION_TITLE });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(CHILD_LABEL)).not.toBeNull();
  });
});
