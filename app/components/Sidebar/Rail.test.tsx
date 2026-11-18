import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import type * as KBar from "kbar";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { NotificationEventType, UserRole } from "@shared/types";
import Storage from "@shared/utils/Storage";
import { metaDisplay, shortcutSeparator } from "@shared/utils/keyboard";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import AppSidebar from "./App";
import { RAIL_PANEL_STORAGE_KEY } from "./Rail";
import { getHeaderExpandedKey } from "./components/Header";
import SettingsSidebar from "./Settings";

const { toggleSearch } = vi.hoisted(() => ({ toggleSearch: vi.fn() }));

vi.mock("kbar", async (importOriginal) => ({
  ...(await importOriginal<typeof KBar>()),
  useKBar: () => ({ query: { toggle: toggleSearch } }),
}));

const USER_ID = "user-1";
const USER_NAME = "Test User";
const TEAM_ID = "team-1";
const TEAM_NAME = "Test Team";
const PERSONAL_ID = "collection-personal";
const COLLECTION_INFO_PATH = "/collections.info";
const COLLECTION_SORT = { field: "index", direction: "asc" as const };
const COLLECTION_NAMES = ["Engineering", "Product"];
const SEARCH_SHORTCUT = `${metaDisplay}${shortcutSeparator}K`;
const NEW_DOC_LABEL = "New doc";
const PERSONAL_EXPANDED_ID = "personal";

const MEMBER_ABILITIES = {
  createDocument: true,
  readTemplate: true,
  update: true,
  createCollection: true,
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function seedStores({
  role = UserRole.Admin,
  abilities = MEMBER_ABILITIES,
  collectionNames = COLLECTION_NAMES,
}: {
  role?: UserRole;
  abilities?: Record<string, boolean>;
  collectionNames?: string[];
} = {}) {
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
  stores.users.add({ id: USER_ID, name: USER_NAME, role });
  stores.auth.add({ id: TEAM_ID, name: TEAM_NAME });
  stores.policies.add({ id: TEAM_ID, abilities });
  collectionNames.forEach((name, index) => {
    stores.collections.add({
      id: `collection-${index}`,
      name,
      index: `a${index}`,
      sort: COLLECTION_SORT,
      documents: [],
    });
  });
  if (collectionNames.length) {
    stores.collections.add({
      id: PERSONAL_ID,
      name: "Personal",
      ownerId: USER_ID,
      index: "z",
      sort: COLLECTION_SORT,
      documents: [],
    });
  }
  if (collectionNames.length) {
    stores.policies.add({
      id: PERSONAL_ID,
      abilities: { readDocument: true, createDocument: true, update: true },
    });
  }
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
}

function LocationProbe() {
  return (
    <Route
      path="*"
      render={({ location }) => (
        <div data-testid="location">{location.pathname}</div>
      )}
    />
  );
}

function renderSidebar(initialPath = "/") {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter initialEntries={[initialPath]}>
          <ActionContextProvider>
            <AppSidebar />
            <LocationProbe />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function getRail() {
  return screen.getByRole("navigation", { name: "Main navigation" });
}

function getRailControls() {
  return Array.from(getRail().querySelectorAll("a, button"));
}

function getRailLabels() {
  return getRailControls().map((element) => element.getAttribute("aria-label"));
}

describe("Rail", () => {
  beforeEach(() => {
    toggleSearch.mockClear();
    Storage.remove(RAIL_PANEL_STORAGE_KEY);
    Storage.remove(getHeaderExpandedKey(PERSONAL_EXPANDED_ID));
    seedStores();
  });

  it("R24 renders the rail buttons in board order with their aria-labels", () => {
    renderSidebar();

    expect(getRailLabels()).toEqual([
      `${TEAM_NAME}, switch workspace`,
      `Search (${SEARCH_SHORTCUT})`,
      "Home",
      "Notifications",
      "Drafts",
      "Templates",
      "Collections",
      "Starred",
      "Settings",
      `${USER_NAME}, account`,
    ]);
  });

  it("R24 puts the account button last in the rail", () => {
    renderSidebar();

    expect(getRailLabels().at(-1)).toBe(`${USER_NAME}, account`);
  });

  it("R10 shows Collections as the pressed button with its panel by default", () => {
    renderSidebar();

    const rail = within(getRail());
    expect(
      rail
        .getByRole("button", { name: "Collections" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      rail.getByRole("button", { name: "Starred" }).getAttribute("aria-pressed")
    ).toBe("false");
    expect(
      screen.getByRole("navigation", { name: "Collections" })
    ).toBeTruthy();
  });

  it("R24 swaps the panel when Starred is pressed", () => {
    renderSidebar();

    fireEvent.click(within(getRail()).getByRole("button", { name: "Starred" }));

    expect(
      within(getRail())
        .getByRole("button", { name: "Starred" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.queryByRole("navigation", { name: "Collections" })
    ).toBeNull();
    expect(screen.getByRole("navigation", { name: "Starred" })).toBeTruthy();
  });

  it("R24 links Home, Drafts, Templates and Settings to their routes", () => {
    renderSidebar();

    const rail = within(getRail());
    const hrefOf = (name: string) =>
      rail.getByRole("link", { name }).getAttribute("href");

    expect(hrefOf("Home")).toBe("/home");
    expect(hrefOf("Drafts")).toBe("/drafts");
    expect(hrefOf("Templates")).toBe("/settings/templates");
    expect(hrefOf("Settings")).toBe("/settings");
  });

  it("R24 marks the link of the current route with aria-current", () => {
    renderSidebar("/drafts");

    const rail = within(getRail());
    expect(
      rail.getByRole("link", { name: "Drafts" }).getAttribute("aria-current")
    ).toBe("page");
    expect(
      rail.getByRole("link", { name: "Home" }).getAttribute("aria-current")
    ).toBeNull();
  });

  it("R24 opens the notifications popover from the Notifications button", () => {
    renderSidebar();

    const button = within(getRail()).getByRole("button", {
      name: "Notifications",
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("R24 announces unread notifications on the Notifications button", () => {
    stores.notifications.add({
      id: "notification-1",
      event: NotificationEventType.UpdateDocument,
    });
    renderSidebar();

    expect(getRailLabels()).toContain("Notifications, 1 new");
  });

  it("R24 announces several unread notifications in the plural", () => {
    ["notification-1", "notification-2"].forEach((id) => {
      stores.notifications.add({
        id,
        event: NotificationEventType.UpdateDocument,
      });
    });
    renderSidebar();

    expect(getRailLabels()).toContain("Notifications, 2 new");
  });

  it("R06 opens the command bar from the Search button", () => {
    renderSidebar();

    fireEvent.click(
      within(getRail()).getByRole("button", {
        name: `Search (${SEARCH_SHORTCUT})`,
      })
    );

    expect(toggleSearch).toHaveBeenCalledTimes(1);
  });

  it("R24 shows a tooltip when a rail button is focused", async () => {
    renderSidebar();

    act(() => {
      within(getRail()).getByRole("link", { name: "Home" }).focus();
    });

    expect((await screen.findByRole("tooltip")).textContent).toContain("Home");
  });

  it("R10 holds only Archive and Trash in the Collections panel footer", () => {
    renderSidebar();

    const footer = within(screen.getByRole("group", { name: "System" }));
    expect(footer.getAllByRole("link").map((link) => link.textContent)).toEqual(
      ["Archive", "Trash"]
    );
    expect(
      footer.getByRole("link", { name: "Archive" }).getAttribute("href")
    ).toBe("/archive");
    expect(
      footer.getByRole("link", { name: "Trash" }).getAttribute("href")
    ).toBe("/trash");
  });

  it("R10 renders Personal inside the collection tree", () => {
    renderSidebar();

    const tree = within(screen.getByRole("group", { name: "Collections" }));
    COLLECTION_NAMES.forEach((name) => {
      expect(tree.getByText(name)).toBeTruthy();
    });
    expect(tree.getByText("Personal")).toBeTruthy();
    expect(screen.queryAllByText("Personal")).toHaveLength(1);
  });

  it("R10 collapses Personal by default", () => {
    renderSidebar();

    expect(screen.queryByText(NEW_DOC_LABEL)).toBeNull();
  });

  it("R10 toggles Personal instead of navigating to its collection", () => {
    renderSidebar();

    const row = screen.getByText("Personal").closest("a, button");
    expect(row?.getAttribute("href")).toBeNull();

    fireEvent.click(row as Element);
    expect(screen.getByText(NEW_DOC_LABEL)).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/");

    fireEvent.click(row as Element);
    expect(screen.queryByText(NEW_DOC_LABEL)).toBeNull();
  });

  it("R10 keeps Sort in sidebar in the Personal row menu", async () => {
    renderSidebar();

    const row = screen.getByText("Personal").closest("a, button") as Element;
    fireEvent.pointerEnter(row);
    const trigger = row.querySelector('button[aria-haspopup="menu"]');
    expect(trigger).toBeTruthy();

    fireEvent.pointerDown(trigger as Element, { button: 0, ctrlKey: false });

    expect(await screen.findByText("Sort in sidebar")).toBeTruthy();
    expect(screen.getByText("New document")).toBeTruthy();
  });

  it("R10 offers New collection in the panel header", () => {
    renderSidebar();

    expect(
      within(screen.getByRole("navigation", { name: "Collections" })).getByRole(
        "button",
        { name: "New collection" }
      )
    ).toBeTruthy();
  });

  it("R24 renders the panel for a workspace without collections", () => {
    seedStores({ collectionNames: [] });
    renderSidebar();

    expect(
      screen.getByRole("navigation", { name: "Collections" })
    ).toBeTruthy();
    expect(screen.getByRole("group", { name: "System" })).toBeTruthy();
    expect(getRailLabels()).toContain("Collections");
  });

  it("R24 hides Drafts, Templates, Settings, Archive and Trash from a viewer", () => {
    seedStores({
      role: UserRole.Viewer,
      abilities: {
        createDocument: false,
        readTemplate: false,
        update: false,
        createCollection: false,
      },
    });
    renderSidebar();

    expect(getRailLabels()).toEqual([
      `${TEAM_NAME}, switch workspace`,
      `Search (${SEARCH_SHORTCUT})`,
      "Home",
      "Notifications",
      "Collections",
      "Starred",
      `${USER_NAME}, account`,
    ]);
    expect(screen.queryByRole("group", { name: "System" })).toBeNull();
  });
});

describe("Settings sidebar", () => {
  beforeEach(() => {
    seedStores();
  });

  it("R24 still renders next to the rail layout", () => {
    render(
      <ThemeProvider theme={light}>
        <Provider rootStore={stores}>
          <MemoryRouter initialEntries={["/settings"]}>
            <ActionContextProvider>
              <SettingsSidebar />
            </ActionContextProvider>
          </MemoryRouter>
        </Provider>
      </ThemeProvider>
    );

    expect(screen.getByRole("link", { name: "Profile" })).toBeTruthy();
  });
});
