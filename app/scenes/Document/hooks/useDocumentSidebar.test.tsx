import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { LazyMotion, domMax } from "framer-motion";
import { runInAction } from "mobx";
import { Provider, observer } from "mobx-react";
import { MemoryRouter, Route, useHistory } from "react-router-dom";
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
import type { CommentsLayoutMode } from "~/scenes/Document/components/commentsLayout";
import useCommentsLayout from "./useCommentsLayout";
import useDocumentSidebar from "./useDocumentSidebar";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "doc-1";
const DOCUMENT_SLUG = "integration-guide-abc123def45";
const DESKTOP_VIEWPORT_QUERY = /min-width:\s*1025px/;
const WIDE_VIEWPORT_QUERY = /min-width:\s*1440px/;
const THREAD_IDS = ["thread-1", "thread-2"];
const UNCACHED_DOCUMENT_PATH = "/doc/uncached-document-xyz987abc65";
const MARGIN_SELECTOR = '[data-testid="comments-margin"]';
const EXIT_TIMEOUT_MS = 3000;
const STAYS_MOUNTED_MS = 1500;
const TEST_TIMEOUT_MS = 15000;

interface Commit {
  mode: CommentsLayoutMode;
  hasMargin: boolean;
}

const commits: Commit[] = [];
let navigate: (path: string) => void = () => {};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubViewport(width: number) {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      matches: WIDE_VIEWPORT_QUERY.test(query)
        ? width >= 1440
        : DESKTOP_VIEWPORT_QUERY.test(query)
          ? width >= 1025
          : false,
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

const CommitProbe = observer(function CommitProbe() {
  const { mode } = useCommentsLayout();
  React.useLayoutEffect(() => {
    commits.push({
      mode,
      hasMargin: !!document.querySelector(MARGIN_SELECTOR),
    });
  });
  return null;
});

const Harness = observer(function Harness() {
  const history = useHistory();
  navigate = (path) => history.push(path);
  const { setEditorInitialized } = useDocumentContext();
  React.useEffect(() => setEditorInitialized(true), [setEditorInitialized]);
  useDocumentSidebar();
  return (
    <>
      {useRightSidebarContent()}
      <CommitProbe />
    </>
  );
});

function renderSidebar(isSplitView = false) {
  return render(
    <LazyMotion features={domMax}>
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
    </LazyMotion>
  );
}

function setPanel(panel: "comments" | null) {
  act(() => stores.ui.setRightSidebar(panel, "primary"));
}

describe("useDocumentSidebar", () => {
  beforeEach(() => {
    seedStores();
    setPanel(null);
    commits.length = 0;
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

  it("R27 renders a margin column at 1280px", () => {
    stubViewport(1280);
    setPanel("comments");
    renderSidebar();

    expect(screen.getByTestId("comments-margin")).toBeTruthy();
  });

  it("R27 renders no margin column below 1025px", () => {
    stubViewport(1024);
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

  it.each([1440, 1280])(
    "R36 renders the margin in the same commit as the layout flip at %ipx",
    async (width) => {
      stubViewport(width);
      renderSidebar();
      await act(async () => {});
      commits.length = 0;

      setPanel("comments");

      expect(commits.length).toBeGreaterThan(0);
      expect(
        commits.filter(({ mode, hasMargin }) => mode !== "none" && !hasMargin)
      ).toEqual([]);
      expect(screen.getByTestId("comments-margin")).toBeTruthy();
    }
  );

  it("R36 keeps the margin mounted until its exit animation completes", async () => {
    stubViewport(1440);
    setPanel("comments");
    renderSidebar();
    await act(async () => {});

    setPanel(null);

    expect(screen.queryByTestId("comments-margin")).not.toBeNull();
    await waitFor(
      () => expect(screen.queryByTestId("comments-margin")).toBeNull(),
      { timeout: EXIT_TIMEOUT_MS }
    );
  });

  it(
    "R36 keeps the margin mounted when moving to a document not yet in the store",
    async () => {
      stubViewport(1440);
      setPanel("comments");
      renderSidebar();
      await act(async () => {});
      const margin = screen.getByTestId("comments-margin");

      act(() => navigate(UNCACHED_DOCUMENT_PATH));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, STAYS_MOUNTED_MS));
      });

      expect(screen.getByTestId("comments-margin")).toBe(margin);
    },
    TEST_TIMEOUT_MS
  );
});
