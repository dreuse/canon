import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import { DocumentContextProvider } from "~/components/DocumentContext";
import Header from "~/components/Header";
import { ActionContextProvider } from "~/hooks/useActionContext";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import DocumentHeader from "~/scenes/Document/components/Header";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";

const PHONE_WIDTH = 390;
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-1";
const COLLECTION_ID = "collection-1";
const COLLECTION_NAME = "Engenharia";
const COLLECTION_URL = "/collection/engenharia-abc123";
const BACK_LABEL = `Back to ${COLLECTION_NAME}`;
const CONVERSATIONS_LABEL = "Conversations";
const MORE_ACTIONS_LABEL = "More actions";
const MENU_LABEL = "Open menu";
const SEARCH_LABEL = "Search";
const NOTIFICATIONS_LABEL = "Notifications";
const NEW_DOCUMENT_LABEL = "New document";
const TOP_BAR_SELECTOR = "[data-top-bar]";
const MAX_WIDTH_QUERY = /\(max-width:\s*(\d+)px\)/;

const kbarQuery = { toggle: vi.fn() };

vi.mock("kbar", () => ({
  useKBar: () => ({ query: kbarQuery }),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const maxWidth = MAX_WIDTH_QUERY.exec(query)?.[1];
    return {
      media: query,
      matches: maxWidth !== undefined && width <= Number(maxWidth),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });
}

function signIn() {
  stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
  stores.auth.add({ id: TEAM_ID, name: "Test Team" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
    stores.collections.isLoaded = true;
  });
}

function renderInApp(children: React.ReactNode) {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <DocumentContextProvider>{children}</DocumentContextProvider>
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function renderDocumentHeader() {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  return renderInApp(
    <DocumentHeader
      document={document}
      revision={undefined}
      isDraft={false}
      isEditing={false}
      isSaving={false}
      isPublishing={false}
      publishingIsDisabled={false}
      savingIsDisabled={false}
      onSelectTemplate={vi.fn()}
      onSave={vi.fn()}
    />
  );
}

describe("Phone top bar", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(client.post).mockResolvedValue({
      data: [],
      policies: [],
      pagination: {},
    });
    stores.clear();
    stubViewport(PHONE_WIDTH);
    signIn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("document", () => {
    beforeEach(() => {
      stores.collections.add({
        id: COLLECTION_ID,
        name: COLLECTION_NAME,
        url: COLLECTION_URL,
        color: "#4E5C6E",
      });
      stores.documents.add({
        id: DOCUMENT_ID,
        title: "Test document",
        collectionId: COLLECTION_ID,
      });
      stores.policies.add({
        id: DOCUMENT_ID,
        abilities: { comment: true, update: true },
      });
    });

    it("R12 renders back, collection, conversations and more actions in one bar", () => {
      renderDocumentHeader();

      const bar = document.querySelector(TOP_BAR_SELECTOR);
      expect(bar).toBeTruthy();

      const controls = [
        screen.getByRole("link", { name: BACK_LABEL }),
        screen.getByText(COLLECTION_NAME),
        screen.getByRole("button", { name: new RegExp(CONVERSATIONS_LABEL) }),
        screen.getByRole("button", { name: MORE_ACTIONS_LABEL }),
      ];
      controls.forEach((control) => {
        expect(control.closest(TOP_BAR_SELECTOR)).toBe(bar);
      });
      const back = screen.getByRole("link", { name: BACK_LABEL });
      expect(back.getAttribute("href")).toBe(COLLECTION_URL);
      expect(back.querySelector("svg")).toBeTruthy();
    });

    it("R12 shows no hamburger on the document bar", () => {
      renderDocumentHeader();

      expect(screen.queryByRole("button", { name: MENU_LABEL })).toBeNull();
    });
  });

  describe("home", () => {
    beforeEach(() => {
      stores.policies.add({
        id: TEAM_ID,
        abilities: { createDocument: true },
      });
    });

    it("R12 renders menu, title, search and new document in one bar", () => {
      renderInApp(
        <Header title="Home" hasSidebar topBar actions={<NewDocumentMenu />} />
      );

      const bar = document.querySelector(TOP_BAR_SELECTOR);
      expect(bar).toBeTruthy();

      const controls = [
        screen.getByRole("button", { name: MENU_LABEL }),
        screen.getByText("Home"),
        screen.getByRole("button", { name: SEARCH_LABEL }),
        screen.getByRole("link", { name: NEW_DOCUMENT_LABEL }),
      ];
      controls.forEach((control) => {
        expect(control.closest(TOP_BAR_SELECTOR)).toBe(bar);
      });
    });

    it("R12 leaves the notifications bell to the drawer", () => {
      renderInApp(<Header title="Home" hasSidebar topBar />);

      expect(
        screen.queryByRole("button", { name: NOTIFICATIONS_LABEL })
      ).toBeNull();
    });
  });
});
