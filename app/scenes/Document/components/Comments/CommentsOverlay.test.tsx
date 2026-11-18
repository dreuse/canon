import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { afterEach, vi } from "vitest";
import { UserRole } from "@shared/types";
import { breakpoints } from "@shared/styles";
import { light } from "@shared/styles/theme";
import { DocumentContextProvider } from "~/components/DocumentContext";
import { SplitViewContext } from "~/components/SplitView/context";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import Comments from "./Comments";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "doc-1";
const PHONE_WIDTH = 390;
const TABLET_WIDTH = 820;
const PANE = "primary";

const SORT_MENU_LABEL = "Sort comments";
const originalMatchMedia = window.matchMedia;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setViewportWidth(width: number) {
  window.matchMedia = ((query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches =
      (!max || width <= Number(max[1])) && (!min || width >= Number(min[1]));
    return {
      media: query,
      matches: !!(max || min) && matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }) as unknown as typeof window.matchMedia;
}

async function renderComments() {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
  stores.auth.add({ id: TEAM_ID, name: "Test Team" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.documents.add({ id: DOCUMENT_ID, title: "Integration guide" });
  stores.policies.add({
    id: DOCUMENT_ID,
    abilities: { comment: true, read: true, update: true },
  });
  stores.ui.setRightSidebar("comments", PANE);
  await act(async () => {
    render(
      <ThemeProvider theme={light}>
        <Provider rootStore={stores}>
          <MemoryRouter initialEntries={[`/doc/${DOCUMENT_ID}`]}>
            <ActionContextProvider>
              <DocumentContextProvider>
                <SplitViewContext.Provider
                  value={{ pane: PANE, isSplitView: false, isFocused: true }}
                >
                  <Route path="/doc/:documentSlug">
                    <Comments />
                  </Route>
                </SplitViewContext.Provider>
              </DocumentContextProvider>
            </ActionContextProvider>
          </MemoryRouter>
        </Provider>
      </ThemeProvider>
    );
  });
}

describe("conversations overlay", () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
  });

  it("R02 R12 opens a modal sheet with tabs on a phone and Esc closes it", async () => {
    setViewportWidth(PHONE_WIDTH);
    await renderComments();

    const dialog = screen.getByRole("dialog");

    expect(dialog.getAttribute("data-vaul-drawer-direction")).toBe("bottom");
    expect(within(dialog).getAllByRole("tab")).toHaveLength(2);
    expect(within(dialog).queryByLabelText(SORT_MENU_LABEL)).toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "Close conversations" })
    ).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(dialog, { key: "Escape" });
    });

    expect(stores.ui.getRightSidebar(PANE)).toBeNull();
  });

  it("R02 opens a drawer from the right over the text on a tablet", async () => {
    setViewportWidth(TABLET_WIDTH);
    expect(TABLET_WIDTH).toBeLessThan(breakpoints.desktop);
    await renderComments();

    const dialog = screen.getByRole("dialog");

    expect(dialog.getAttribute("data-vaul-drawer-direction")).toBe("right");
    expect(within(dialog).getAllByRole("tab")).toHaveLength(2);
    expect(within(dialog).getByLabelText(SORT_MENU_LABEL)).toBeTruthy();
  });
});
