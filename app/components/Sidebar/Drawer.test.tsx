import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { Router } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import type * as KBar from "kbar";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import Header from "~/components/Header";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import history from "~/utils/history";
import AppSidebar from "./App";

const { toggleSearch } = vi.hoisted(() => ({ toggleSearch: vi.fn() }));

vi.mock("kbar", async (importOriginal) => ({
  ...(await importOriginal<typeof KBar>()),
  useKBar: () => ({ query: { toggle: toggleSearch } }),
}));

const TABLET_WIDTH = 820;
const DESKTOP_WIDTH = 1280;
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const TEAM_NAME = "Test Team";
const COLLECTION_NAME = "Engineering";
const COLLECTION_INFO_PATH = "/collections.info";
const DRAFTS_PATH = "/drafts";
const PERSONAL_ID = "collection-personal";
const COLLECTION_SORT = { field: "index", direction: "asc" as const };
const MAX_WIDTH_QUERY = /\(max-width:\s*(\d+)px\)/;
const OPEN_MENU_LABEL = "Open menu";
const CLOSE_MENU_LABEL = "Close menu";
const MAIN_NAVIGATION_LABEL = "Main navigation";
const RAIL_ONLY_LABEL = "Starred";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function matchesWidth(query: string, width: number) {
  const maxWidth = MAX_WIDTH_QUERY.exec(query)?.[1];
  return maxWidth !== undefined && width <= Number(maxWidth);
}

function stubViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    matches: matchesWidth(query, width),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function stubResizableViewport(initialWidth: number) {
  let width = initialWidth;
  const listeners: (() => void)[] = [];
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() {
      return matchesWidth(query, width);
    },
    addEventListener: (_type: string, listener: () => void) => {
      listeners.push(listener);
    },
    removeEventListener: (_type: string, listener: () => void) => {
      listeners.splice(listeners.indexOf(listener), 1);
    },
  }));
  return (nextWidth: number) => {
    width = nextWidth;
    [...listeners].forEach((listener) => act(listener));
  };
}

function seedStores() {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockImplementation(
    async (path: string, body?: { id?: string }) => {
      if (path === COLLECTION_INFO_PATH) {
        const { id, name, index, ownerId } =
          stores.collections.get(body?.id ?? "") ?? {};
        return {
          data: {
            id,
            name,
            index,
            ownerId,
            sort: COLLECTION_SORT,
            documents: [],
          },
          policies: [],
        };
      }
      return { data: [], policies: [], pagination: {} };
    }
  );
  stores.clear();
  stores.ui.hideMobileSidebar();
  stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
  stores.auth.add({ id: TEAM_ID, name: TEAM_NAME });
  stores.policies.add({
    id: TEAM_ID,
    abilities: { createDocument: true, readTemplate: true, update: true },
  });
  stores.collections.add({
    id: "collection-0",
    name: COLLECTION_NAME,
    index: "a0",
    sort: COLLECTION_SORT,
    documents: [],
  });
  stores.collections.add({
    id: PERSONAL_ID,
    name: "Personal",
    ownerId: USER_ID,
    index: "z",
    sort: COLLECTION_SORT,
    documents: [],
  });
  stores.policies.add({
    id: PERSONAL_ID,
    abilities: { readDocument: true, createDocument: true, update: true },
  });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
}

function renderShell(topBar = false) {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <Router history={history}>
          <ActionContextProvider>
            <Header title="Home" hasSidebar topBar={topBar} />
            <AppSidebar />
          </ActionContextProvider>
        </Router>
      </Provider>
    </ThemeProvider>
  );
}

function openDrawer() {
  const menuButton = screen.getByRole("button", { name: OPEN_MENU_LABEL });
  act(() => menuButton.focus());
  fireEvent.click(menuButton);
  return menuButton;
}

describe("Sidebar drawer below the desktop breakpoint", () => {
  beforeEach(() => {
    toggleSearch.mockClear();
    history.push("/");
    seedStores();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("R02 does not render the rail at 820px", () => {
    stubViewport(TABLET_WIDTH);
    renderShell();

    expect(
      screen.queryByRole("navigation", { name: MAIN_NAVIGATION_LABEL })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: RAIL_ONLY_LABEL })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("R02 opens the drawer from the top bar menu button", () => {
    stubViewport(TABLET_WIDTH);
    renderShell();

    openDrawer();

    const drawer = within(screen.getByRole("dialog"));
    expect(drawer.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(drawer.getByRole("link", { name: "Drafts" })).toBeTruthy();
    expect(drawer.getByRole("link", { name: "Templates" })).toBeTruthy();
    expect(drawer.getByText(COLLECTION_NAME)).toBeTruthy();
    expect(drawer.getByRole("link", { name: "Archive" })).toBeTruthy();
    expect(drawer.getByRole("link", { name: "Trash" })).toBeTruthy();
    expect(drawer.getByRole("button", { name: CLOSE_MENU_LABEL })).toBeTruthy();
  });

  it("R02 closes the drawer with Esc and returns focus to the menu button", async () => {
    stubViewport(TABLET_WIDTH);
    renderShell();
    const menuButton = openDrawer();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(menuButton));
  });

  it("R02 keeps focus on an element focused outside the drawer while it closes", async () => {
    stubViewport(TABLET_WIDTH);
    renderShell();
    const outsideInput = document.createElement("input");
    document.body.appendChild(outsideInput);
    openDrawer();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    act(() => outsideInput.focus());
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      expect(document.activeElement).toBe(outsideInput);
    } finally {
      outsideInput.remove();
    }
  });

  it("R02 closes the drawer from the close button", () => {
    stubViewport(TABLET_WIDTH);
    renderShell();
    openDrawer();

    fireEvent.click(screen.getByRole("button", { name: CLOSE_MENU_LABEL }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("R02 closes the drawer when the route changes", () => {
    stubViewport(TABLET_WIDTH);
    renderShell();
    openDrawer();

    act(() => history.push(DRAFTS_PATH));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("R02 keeps the rail and hides the menu button at 1280px", () => {
    stubViewport(DESKTOP_WIDTH);
    renderShell();

    expect(
      screen.getByRole("navigation", { name: MAIN_NAVIGATION_LABEL })
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: OPEN_MENU_LABEL })).toBeNull();
  });

  it("R02 survives widening across 1025px with the drawer closed", () => {
    const resize = stubResizableViewport(TABLET_WIDTH);
    renderShell();

    resize(DESKTOP_WIDTH);

    expect(
      screen.getByRole("navigation", { name: MAIN_NAVIGATION_LABEL })
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("R02 survives widening across 1025px with the drawer open", () => {
    const resize = stubResizableViewport(TABLET_WIDTH);
    renderShell();
    openDrawer();

    resize(DESKTOP_WIDTH);

    expect(
      screen.getByRole("navigation", { name: MAIN_NAVIGATION_LABEL })
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("R02 shows search and notifications in the top bar only for scenes", () => {
    stubViewport(TABLET_WIDTH);
    const { unmount } = renderShell();

    expect(screen.queryByRole("button", { name: "Notifications" })).toBeNull();
    unmount();
    renderShell(true);

    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });
});
