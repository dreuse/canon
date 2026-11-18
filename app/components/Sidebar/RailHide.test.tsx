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
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import type * as KBar from "kbar";
import { vi } from "vitest";
import { light, sidebarRailWidth } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import AppSidebar from "./App";

vi.mock("kbar", async (importOriginal) => ({
  ...(await importOriginal<typeof KBar>()),
  useKBar: () => ({ query: { toggle: vi.fn() } }),
}));

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const PERSONAL_ID = "collection-personal";
const COLLECTION_INFO_PATH = "/collections.info";
const MEMBERSHIPS_PATH = "/userMemberships.list";
const COLLECTION_NAME = "Engineering";
const COLLECTION_SORT = { field: "index", direction: "asc" as const };
const TOGGLE_KEY = ".";
const RAIL_LABEL = "Main navigation";
const PANEL_LABEL = "Collections";
const STARRED_LABEL = "Starred";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function ShortcutHarness() {
  const { ui } = useStores();
  useKeyDown(TOGGLE_KEY, () => ui.toggleCollapsedSidebar(), { metaKey: true });
  return null;
}

function renderSidebar() {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <ShortcutHarness />
            <AppSidebar />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function pressToggleShortcut() {
  fireEvent.keyDown(window, {
    key: TOGGLE_KEY,
    metaKey: true,
    ctrlKey: true,
  });
}

function getSidebar() {
  return document.getElementById("sidebar") as HTMLElement;
}

function queryPanel() {
  return screen.queryByRole("navigation", { name: PANEL_LABEL });
}

function getRailButton(name: string) {
  return within(screen.getByRole("navigation", { name: RAIL_LABEL })).getByRole(
    "button",
    { name }
  );
}

describe("Rail hide", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(client.post).mockClear();
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
    stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
    stores.auth.add({ id: TEAM_ID, name: "Test Team" });
    stores.policies.add({
      id: TEAM_ID,
      abilities: { createDocument: true, update: true },
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
      stores.ui.sidebarCollapsed = false;
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("R25 hides the panel and keeps the rail on the shortcut", () => {
    renderSidebar();
    expect(queryPanel()).toBeTruthy();

    pressToggleShortcut();

    expect(queryPanel()).toBeNull();
    expect(screen.getByRole("navigation", { name: RAIL_LABEL })).toBeTruthy();
    expect(getSidebar().style.width).toBe(`${sidebarRailWidth}px`);
  });

  it("R25 keeps loading the panel data while the panel is hidden", async () => {
    runInAction(() => {
      stores.ui.sidebarCollapsed = true;
    });
    renderSidebar();

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        MEMBERSHIPS_PATH,
        expect.anything()
      )
    );
    expect(queryPanel()).toBeNull();
  });

  it("R25 keeps the hidden panel mounted so its state survives", () => {
    renderSidebar();

    pressToggleShortcut();

    const panel = document.querySelector(
      `nav[aria-label="${PANEL_LABEL}"]`
    ) as HTMLElement;
    expect(panel.hasAttribute("hidden")).toBe(true);
    pressToggleShortcut();
    expect(panel.hasAttribute("hidden")).toBe(false);
  });

  it("R25 shows the panel again on a second shortcut", () => {
    renderSidebar();

    pressToggleShortcut();
    pressToggleShortcut();

    expect(queryPanel()).toBeTruthy();
    expect(getSidebar().style.width).not.toBe(`${sidebarRailWidth}px`);
  });

  it("R25 does not open the panel when hovering the edge", () => {
    renderSidebar();
    pressToggleShortcut();

    const sidebar = getSidebar();
    fireEvent.pointerEnter(sidebar);
    fireEvent.pointerMove(sidebar, { buttons: 0 });
    fireEvent.pointerLeave(sidebar);

    expect(queryPanel()).toBeNull();
    expect(sidebar.style.width).toBe(`${sidebarRailWidth}px`);
  });

  it("R25 moves focus to the rail button when the panel hides", () => {
    renderSidebar();
    const link = screen.getByRole("link", { name: COLLECTION_NAME });
    act(() => link.focus());
    expect(document.activeElement).toBe(link);

    pressToggleShortcut();

    expect(document.activeElement).toBe(getRailButton(PANEL_LABEL));
  });

  it("R25 shows the panel again when a panel rail button is pressed", () => {
    renderSidebar();
    pressToggleShortcut();

    fireEvent.click(getRailButton(STARRED_LABEL));

    expect(
      screen.getByRole("navigation", { name: STARRED_LABEL })
    ).toBeTruthy();
    expect(stores.ui.sidebarCollapsed).toBe(false);
  });
});
