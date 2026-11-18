import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { UserRole } from "@shared/types";
import { light } from "@shared/styles/theme";
import {
  DocumentContextProvider,
  useDocumentContext,
} from "~/components/DocumentContext";
import { SplitViewContext } from "~/components/SplitView/context";
import {
  RightSidebarProvider,
  useRightSidebarContent,
} from "~/components/RightSidebarContext";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import useDocumentSidebar from "./useDocumentSidebar";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "doc-1";
const DOCUMENT_SLUG = "integration-guide-abc123def45";
const WIDE_VIEWPORT_QUERY = /min-width:\s*1440px/;
const THREAD_IDS = ["thread-1", "thread-2"];

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubViewport(width: number) {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      matches: WIDE_VIEWPORT_QUERY.test(query) ? width >= 1440 : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}

function seedStores() {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockResolvedValue({
    data: [],
    policies: [],
    pagination: {},
  });
  stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
  stores.auth.add({ id: TEAM_ID, name: "Test Team" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.documents.add({
    id: DOCUMENT_ID,
    urlId: DOCUMENT_SLUG,
    title: "Integration guide",
  });
  stores.policies.add({
    id: DOCUMENT_ID,
    abilities: { comment: true, read: true },
  });
  THREAD_IDS.forEach((id) =>
    stores.comments.add({
      id,
      documentId: DOCUMENT_ID,
      createdById: USER_ID,
      reactions: [],
      data: { type: "doc", content: [{ type: "paragraph" }] },
    })
  );
}

function Harness() {
  const { setEditorInitialized } = useDocumentContext();
  React.useEffect(() => setEditorInitialized(true), [setEditorInitialized]);
  useDocumentSidebar();
  return <>{useRightSidebarContent()}</>;
}

function renderSidebar(isSplitView = false) {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter initialEntries={[`/doc/${DOCUMENT_SLUG}`]}>
          <RightSidebarProvider>
            <ActionContextProvider>
              <DocumentContextProvider>
                <SplitViewContext.Provider
                  value={{ pane: "primary", isSplitView, isFocused: true }}
                >
                  <Route path="/doc/:documentSlug">
                    <Harness />
                  </Route>
                </SplitViewContext.Provider>
              </DocumentContextProvider>
            </ActionContextProvider>
          </RightSidebarProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function setPanel(panel: "comments" | null) {
  act(() => stores.ui.setRightSidebar(panel, "primary"));
}

describe("useDocumentSidebar", () => {
  beforeEach(() => {
    seedStores();
    setPanel(null);
  });

  it("R04 renders a margin column with one card per open thread at 1440px", () => {
    stubViewport(1440);
    setPanel("comments");
    renderSidebar();

    const column = screen.getByTestId("comments-margin");
    const cards = column.querySelectorAll("[data-margin-card]");

    expect(cards).toHaveLength(THREAD_IDS.length);
  });

  it("R04 renders the new comment form after the cards when comments are allowed", () => {
    stubViewport(1440);
    setPanel("comments");
    renderSidebar();

    const column = screen.getByTestId("comments-margin");

    expect(column.lastElementChild?.hasAttribute("data-margin-form")).toBe(
      true
    );
  });

  it("R04 renders no margin column below 1440px", () => {
    stubViewport(1439);
    setPanel("comments");
    renderSidebar();

    expect(screen.queryByTestId("comments-margin")).toBeNull();
  });

  it("R04 keeps the comments panel in a split view at 1440px", () => {
    stubViewport(1440);
    setPanel("comments");
    renderSidebar(true);

    expect(screen.queryByTestId("comments-margin")).toBeNull();
  });

  it("R04 renders no comments rail with Conversas open", () => {
    stubViewport(1440);
    setPanel("comments");
    renderSidebar();

    expect(screen.queryByRole("button", { name: "Comments" })).toBeNull();
    expect(screen.queryByText(/comments?$/)).toBeNull();
  });

  it.each([1440, 1280, 1920])(
    "R04 renders no comments rail with Conversas closed at %ipx",
    (width) => {
      stubViewport(width);
      renderSidebar();

      expect(screen.queryByRole("button", { name: "Comments" })).toBeNull();
      expect(screen.queryByTestId("comments-margin")).toBeNull();
      expect(screen.queryByText(/comments?$/)).toBeNull();
    }
  );
});
