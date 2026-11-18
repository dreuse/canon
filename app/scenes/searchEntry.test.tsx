import { render, waitFor } from "@testing-library/react";
import * as React from "react";
import { Provider } from "mobx-react";
import { MemoryRouter, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import CollectionScene from "./Collection";
import Home from "./Home";

const COLLECTION_ID = "0b8d4a52-6f0e-4c34-9d5e-3c1f3a1c2b11";
const COLLECTION_PATH = "/collection/engineering-abc123";
const collectionData = {
  id: COLLECTION_ID,
  urlId: "abc123",
  url: COLLECTION_PATH,
  name: "Engineering",
  color: "#4f6ef7",
  updatedAt: new Date().toISOString(),
};
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const SEARCH_INPUT_SELECTOR = "input[type=search]";

vi.mock("~/components/PinnedDocuments", () => ({ default: () => null }));
vi.mock("./Collection/components/Overview", () => ({ default: () => null }));
vi.mock("./Collection/components/Navigation", () => ({
  default: () => null,
  CollectionOrder: {},
}));
vi.mock("./Collection/components/Header", () => ({ Header: () => null }));
vi.mock("./Collection/components/Actions", () => ({ default: () => null }));
vi.mock("./Collection/components/Notices", () => ({ default: () => null }));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

function renderAt(path: string, element: React.ReactElement) {
  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter initialEntries={[path]}>
          <ActionContextProvider>
            <Route path={["/collection/:collectionSlug", "/home"]}>
              <React.Suspense fallback="SUSPENDED">{element}</React.Suspense>
            </Route>
          </ActionContextProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe("search entry", () => {
  beforeEach(() => {
    const responses: Record<string, object> = {
      "/collections.info": collectionData,
      "/shares.info": { shares: [] },
    };
    vi.mocked(client.post).mockImplementation(async (url: string) => ({
      data: responses[url] ?? [],
      pagination: {},
    }));
    stores.users.clear();
    stores.users.add({ id: USER_ID, name: "Rafael Souza" });
    stores.auth.add({ id: TEAM_ID, name: "Omni" });
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
    stores.collections.clear();
    stores.collections.add(collectionData);
  });

  it("R06 Home renders no search input", () => {
    const { container } = renderAt("/home", <Home />);
    expect(container.querySelector(SEARCH_INPUT_SELECTOR)).toBeNull();
  });

  it("R06 collection page renders no header search input", async () => {
    const { container, findByText } = renderAt(
      COLLECTION_PATH,
      <CollectionScene />
    );
    await waitFor(() =>
      expect(stores.ui.activeCollectionId).toBe(COLLECTION_ID)
    );
    await findByText(collectionData.name);
    expect(container.querySelector(SEARCH_INPUT_SELECTOR)).toBeNull();
  });
});
