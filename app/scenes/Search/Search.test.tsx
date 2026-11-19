import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import Search from "./Search";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const COLLECTION_ID = "0b8d4a52-6f0e-4c34-9d5e-3c1f3a1c2b11";
const COLLECTION_NAME = "Engineering";
const DOCUMENT_TITLE = "GitHub integration";
const AUTHOR_NAME = "Marina Lopes";
const QUERY = "webhook";
const SNIPPET_BEFORE = "Compare the header with the ";
const SNIPPET_AFTER = " of the request body.";
const HOME_PATH = "/home";
const HOME_TEXT = "home page";
const MOBILE_QUERY = "(max-width: 736px)";
const SEARCH_PATH = "/search";

const searchResult = {
  ranking: 1,
  context: `${SNIPPET_BEFORE}<b>${QUERY}</b>${SNIPPET_AFTER}`,
  document: {
    id: "doc-1",
    url: "/doc/github-integration-doc1",
    title: DOCUMENT_TITLE,
    collectionId: COLLECTION_ID,
    data: ProsemirrorDataHelper.getEmpty(),
    publishedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 100000).toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: { id: USER_ID, name: AUTHOR_NAME },
  },
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setMobile(isMobile: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    media: query,
    matches: isMobile && query === MOBILE_QUERY,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

function renderSearch(search: string) {
  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter
          initialEntries={[HOME_PATH, `${SEARCH_PATH}?q=${QUERY}${search}`]}
          initialIndex={1}
        >
          <ActionContextProvider>
            <Route path={HOME_PATH}>{HOME_TEXT}</Route>
            <Route path={SEARCH_PATH}>
              <Search />
            </Route>
          </ActionContextProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

function seedStores(results: object[]) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockImplementation(async (url: string) => ({
    data: url === "/documents.search" ? results : [],
    policies: [],
    pagination: { total: results.length },
  }));
  stores.users.clear();
  stores.documents.clear();
  stores.collections.clear();
  stores.policies.clear();
  stores.policies.add({
    id: searchResult.document.id,
    abilities: { update: true },
  });
  stores.users.add({ id: USER_ID, name: AUTHOR_NAME });
  stores.auth.add({ id: TEAM_ID, name: "Omni" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.collections.add({
    id: COLLECTION_ID,
    name: COLLECTION_NAME,
    color: "#4f6ef7",
  });
}

function isBefore(first: Element, second: Element) {
  return !!(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
  );
}

describe("search page", () => {
  beforeEach(() => {
    setMobile(false);
    seedStores([searchResult]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("R06 result row shows path, title, snippet and meta in board order", async () => {
    renderSearch("");
    const path = await screen.findByTestId("search-result-path");
    const title = screen.getByTestId("search-result-title");
    const snippet = screen.getByTestId("search-result-snippet");
    const meta = screen.getByTestId("search-result-meta");

    expect(path.textContent).toContain(COLLECTION_NAME);
    expect(title.textContent).toContain(DOCUMENT_TITLE);
    expect(snippet.textContent).toBe(
      `${SNIPPET_BEFORE}${QUERY}${SNIPPET_AFTER}`
    );
    expect(meta.textContent).toContain(AUTHOR_NAME);
    expect(isBefore(path, title)).toBe(true);
    expect(isBefore(title, snippet)).toBe(true);
    expect(isBefore(snippet, meta)).toBe(true);
  });

  it("R06 result path shows the collection icon and no dot", async () => {
    renderSearch("");
    const path = await screen.findByTestId("search-result-path");

    expect(path.textContent).toContain(COLLECTION_NAME);
    expect(path.querySelector("svg")).not.toBeNull();
    expect(path.querySelector('[data-testid="collection-dot"]')).toBeNull();
  });

  it("R06 result row highlights the matched term in the snippet", async () => {
    renderSearch("");
    const snippet = await screen.findByTestId("search-result-snippet");
    expect(snippet.querySelector("mark")?.textContent).toBe(QUERY);
  });

  it("R06 results header shows the count and the sort control", async () => {
    renderSearch("");
    const header = await screen.findByTestId("search-results-header");
    await waitFor(() => expect(header.textContent).toContain("1 result"));
    expect(header.textContent).toContain("Relevance");
    expect(header.querySelector("button")).not.toBeNull();
  });

  it("R06 set filter chip shows its value and a remove button", async () => {
    renderSearch(`&collectionId=${COLLECTION_ID}`);
    const chip = await screen.findByTestId("filter-chip-collectionId");
    expect(chip.getAttribute("data-set")).toBe("true");
    expect(chip.textContent).toContain(COLLECTION_NAME);
    expect(chip.querySelector("[aria-label='Remove filter']")).not.toBeNull();
  });

  it("R06 unset filter chips show a label and a chevron", async () => {
    renderSearch("");
    const chip = await screen.findByTestId("filter-chip-userId");
    expect(chip.getAttribute("data-set")).toBe("false");
    expect(chip.textContent).toContain("Edited by");
    expect(chip.querySelector("[data-disclosure]")).not.toBeNull();
    expect(chip.querySelector("[aria-label='Remove filter']")).toBeNull();
  });

  it("R06 no results state still renders", async () => {
    seedStores([]);
    renderSearch("");
    await screen.findByText("No documents found for your search filters.");
    expect(screen.queryByTestId("search-result-title")).toBeNull();
  });

  it("R06 desktop has no cancel button", async () => {
    renderSearch("");
    await screen.findByTestId("search-result-title");
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("R06 desktop result row offers a select checkbox", async () => {
    renderSearch("");
    await screen.findByTestId("search-result-title");
    expect(screen.getByRole("checkbox")).not.toBeNull();
  });

  it("R06 phone result row has no select checkbox over the path", async () => {
    setMobile(true);
    renderSearch("");
    const path = await screen.findByTestId("search-result-path");
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(path);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  async function focusResultRow() {
    const title = await screen.findByTestId("search-result-title");
    const row = title.closest("a");
    expect(row).not.toBeNull();
    fireEvent.focus(row as HTMLAnchorElement);
  }

  it("R06 desktop result row shows row actions", async () => {
    renderSearch("");
    await focusResultRow();
    expect(await screen.findByRole("button", { name: "Edit" })).not.toBeNull();
  });

  it("R06 phone result row shows no row actions", async () => {
    setMobile(true);
    renderSearch("");
    await focusResultRow();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Document options" })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /star/i })).toBeNull();
  });

  it("R06 phone branch shows a cancel button that goes back", async () => {
    setMobile(true);
    renderSearch("");
    const cancel = await screen.findByRole("button", { name: "Cancel" });
    fireEvent.click(cancel);
    await screen.findByText(HOME_TEXT);
  });
});
