import {
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
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import Storage from "@shared/utils/Storage";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import AppSidebar from "./App";
import { RAIL_PANEL_STORAGE_KEY } from "./Rail";

vi.mock("kbar", async (importOriginal) => ({
  ...(await importOriginal<typeof KBar>()),
  useKBar: () => ({ query: { toggle: vi.fn() } }),
}));

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const COLLECTION_ID = "collection-0";
const DOCUMENT_ID = "document-1";
const DOCUMENT_TITLE = "Starred runbook";
const COLLECTION_INFO_PATH = "/collections.info";
const COLLECTION_SORT = { field: "index", direction: "asc" as const };
const DOCUMENT_INFO_PATH = "/documents.info";
const EMPTY_STATE = "Nothing starred yet.";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function seedStores({ starred = true }: { starred?: boolean } = {}) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockImplementation(
    async (path: string, body?: { id?: string }) => {
      if (path === COLLECTION_INFO_PATH) {
        const { id, name, index } =
          stores.collections.get(body?.id ?? "") ?? {};
        return {
          data: { id, name, index, sort: COLLECTION_SORT, documents: [] },
          policies: [],
        };
      }
      if (path === DOCUMENT_INFO_PATH) {
        return {
          data: {
            document: {
              id: DOCUMENT_ID,
              title: DOCUMENT_TITLE,
              collectionId: COLLECTION_ID,
            },
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
    abilities: { createDocument: true, update: true, createCollection: true },
  });
  stores.collections.add({
    id: COLLECTION_ID,
    name: "Engineering",
    index: "a0",
    sort: COLLECTION_SORT,
    documents: [],
  });
  if (starred) {
    stores.documents.add({
      id: DOCUMENT_ID,
      title: DOCUMENT_TITLE,
      collectionId: COLLECTION_ID,
    });
    stores.stars.add({ id: "star-1", documentId: DOCUMENT_ID, index: "a0" });
  }
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
}

function renderSidebar() {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter initialEntries={["/"]}>
          <ActionContextProvider>
            <AppSidebar />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function railButton(name: string) {
  return within(
    screen.getByRole("navigation", { name: "Main navigation" })
  ).getByRole("button", { name });
}

describe("Rail panels", () => {
  beforeEach(() => {
    Storage.remove(RAIL_PANEL_STORAGE_KEY);
    seedStores();
  });

  it("R24 swaps to the Starred panel and back to Collections", async () => {
    renderSidebar();

    fireEvent.click(railButton("Starred"));

    const panel = within(screen.getByRole("navigation", { name: "Starred" }));
    expect(panel.getByRole("heading", { name: "Starred" })).toBeTruthy();
    expect(await panel.findByText(DOCUMENT_TITLE)).toBeTruthy();
    expect(railButton("Starred").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(railButton("Collections"));

    expect(
      screen.getByRole("navigation", { name: "Collections" })
    ).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Starred" })).toBeNull();
    expect(railButton("Collections").getAttribute("aria-pressed")).toBe("true");
  });

  it("R24 shows the empty state in the Starred panel when nothing is starred", async () => {
    seedStores({ starred: false });
    renderSidebar();

    fireEvent.click(railButton("Starred"));

    const panel = within(screen.getByRole("navigation", { name: "Starred" }));
    expect(panel.getByRole("heading", { name: "Starred" })).toBeTruthy();
    expect(await panel.findByText(EMPTY_STATE)).toBeTruthy();
  });

  it("R24 restores the Starred panel after a remount", () => {
    const { unmount } = renderSidebar();
    fireEvent.click(railButton("Starred"));
    unmount();

    renderSidebar();

    expect(railButton("Starred").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("navigation", { name: "Starred" })).toBeTruthy();
  });

  it("R24 shows the sidebar after a reload on the Starred panel", async () => {
    Storage.set(RAIL_PANEL_STORAGE_KEY, "starred");
    runInAction(() => {
      stores.userMemberships.isLoaded = false;
    });
    renderSidebar();

    await waitFor(() => expect(stores.ui.readyToShow).toBe(true));
    expect(client.post).toHaveBeenCalledWith(
      "/userMemberships.list",
      expect.anything()
    );
  });

  it("R24 falls back to Collections for an unknown stored panel", () => {
    Storage.set(RAIL_PANEL_STORAGE_KEY, "bogus");
    renderSidebar();

    expect(railButton("Collections").getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("navigation", { name: "Collections" })
    ).toBeTruthy();
  });
});
