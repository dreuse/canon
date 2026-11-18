import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { runInAction } from "mobx";
import { observer, Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { UserRole } from "@shared/types";
import { light } from "@shared/styles/theme";
import {
  DocumentContextProvider,
  useDocumentContext,
} from "~/components/DocumentContext";
import { SplitViewContext } from "~/components/SplitView/context";
import type { Editor } from "~/editor";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import { CommentsMargin } from "./CommentsMargin";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "doc-1";
const OPEN_THREAD_IDS = ["open-1", "open-2", "open-3"];
const RESOLVED_THREAD_IDS = ["resolved-1", "resolved-2", "resolved-3"];
const RESOLVED_AT = "2026-11-18T10:00:00.000Z";
const COMMENT_DATA = { type: "doc", content: [{ type: "paragraph" }] };

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let activateComment: (commentId: string | null) => void = () => {};
let installEditor: (editor: Editor) => void = () => {};
let initializeEditor: (initialized: boolean) => void = () => {};

function seedThread(id: string, resolved: boolean, createdAt: string) {
  stores.comments.add({
    id,
    documentId: DOCUMENT_ID,
    createdById: USER_ID,
    createdAt,
    reactions: [],
    data: COMMENT_DATA,
    ...(resolved ? { resolvedAt: RESOLVED_AT } : {}),
  });
  stores.policies.add({
    id,
    abilities: { resolve: true, update: true, delete: true },
  });
}

function seedStores(resolvedIds: string[] = RESOLVED_THREAD_IDS) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockReset();
  stores.comments.clear();
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
  OPEN_THREAD_IDS.forEach((id, index) =>
    seedThread(id, false, `2026-11-18T09:0${index}:00.000Z`)
  );
  resolvedIds.forEach((id, index) =>
    seedThread(id, true, `2026-11-17T09:0${index}:00.000Z`)
  );
}

const Probe = observer(function Probe() {
  const {
    focusedCommentId,
    setFocusedCommentId,
    setEditor,
    setEditorInitialized,
  } = useDocumentContext();
  activateComment = setFocusedCommentId;
  installEditor = setEditor;
  initializeEditor = setEditorInitialized;
  return <output data-testid="focused">{focusedCommentId ?? ""}</output>;
});

async function renderMargin() {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document not seeded");
  }
  await act(async () => {
    render(
      <ThemeProvider theme={light}>
        <Provider rootStore={stores}>
          <MemoryRouter>
            <ActionContextProvider>
              <DocumentContextProvider>
                <SplitViewContext.Provider
                  value={{
                    pane: "primary",
                    isSplitView: false,
                    isFocused: true,
                  }}
                >
                  <Probe />
                  <CommentsMargin document={document} />
                </SplitViewContext.Provider>
              </DocumentContextProvider>
            </ActionContextProvider>
          </MemoryRouter>
        </Provider>
      </ThemeProvider>
    );
  });
}

function getCard(threadId: string) {
  const card = document.querySelector<HTMLElement>(
    `[data-margin-card="${threadId}"]`
  );
  if (!card) {
    throw new Error(`no card for ${threadId}`);
  }
  return card;
}

function createEditorStub(commentOrder: string[], onResolve: () => void) {
  return {
    view: { dom: document.createElement("div"), state: { doc: undefined } },
    getHeadings: () => [],
    getTasks: () => [],
    getComments: () => commentOrder.map((id) => ({ id })),
    updateComment: onResolve,
    revealComment: vi.fn(),
  } as unknown as Editor;
}

function getFocusedId() {
  return screen.getByTestId("focused").textContent;
}

function getCardIds() {
  return [...document.querySelectorAll("[data-margin-card]")].map((card) =>
    card.getAttribute("data-margin-card")
  );
}

describe("margin cards", () => {
  beforeEach(() => {
    seedStores();
  });

  it("R04 clicking a comment mark activates its card", async () => {
    await renderMargin();

    act(() => activateComment(OPEN_THREAD_IDS[1]));

    expect(getCard(OPEN_THREAD_IDS[1]).getAttribute("aria-current")).toBe(
      "true"
    );
    expect(getCard(OPEN_THREAD_IDS[0]).hasAttribute("aria-current")).toBe(
      false
    );
  });

  it("R04 activating a card marks its highlight as selected", async () => {
    await renderMargin();

    fireEvent.click(getCard(OPEN_THREAD_IDS[2]).firstElementChild as Element);

    expect(getFocusedId()).toBe(OPEN_THREAD_IDS[2]);
    expect(getCard(OPEN_THREAD_IDS[2]).getAttribute("aria-current")).toBe(
      "true"
    );
  });

  it("R04 each card is reachable by Tab", async () => {
    await renderMargin();

    OPEN_THREAD_IDS.forEach((id) => {
      expect(getCard(id).getAttribute("tabindex")).toBe("0");
    });
  });

  it("R04 Enter on a card activates it", async () => {
    await renderMargin();

    fireEvent.keyDown(getCard(OPEN_THREAD_IDS[1]), { key: "Enter" });

    expect(getFocusedId()).toBe(OPEN_THREAD_IDS[1]);
  });

  it("R04 Enter inside a card does not activate another card", async () => {
    await renderMargin();
    const inner = getCard(OPEN_THREAD_IDS[0]).firstElementChild as Element;

    fireEvent.keyDown(inner, { key: "Enter" });

    expect(getFocusedId()).toBe("");
  });

  it("R04 resolving the active thread activates the next card", async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        id: OPEN_THREAD_IDS[0],
        documentId: DOCUMENT_ID,
        createdById: USER_ID,
        reactions: [],
        data: COMMENT_DATA,
        resolvedAt: RESOLVED_AT,
      },
      policies: [],
    });
    await renderMargin();
    act(() => activateComment(OPEN_THREAD_IDS[0]));

    await act(async () => {
      fireEvent.click(
        within(getCard(OPEN_THREAD_IDS[0])).getByLabelText("Resolve")
      );
    });

    expect(getFocusedId()).toBe(OPEN_THREAD_IDS[1]);
  });

  it("R04 resolving the last active thread activates the previous card", async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        id: OPEN_THREAD_IDS[2],
        documentId: DOCUMENT_ID,
        createdById: USER_ID,
        reactions: [],
        data: COMMENT_DATA,
        resolvedAt: RESOLVED_AT,
      },
      policies: [],
    });
    await renderMargin();
    act(() => activateComment(OPEN_THREAD_IDS[2]));

    await act(async () => {
      fireEvent.click(
        within(getCard(OPEN_THREAD_IDS[2])).getByLabelText("Resolve")
      );
    });

    expect(getFocusedId()).toBe(OPEN_THREAD_IDS[1]);
  });

  it("R04 resolving follows the editor order after the store marks the thread resolved", async () => {
    const editorOrder = [
      OPEN_THREAD_IDS[1],
      OPEN_THREAD_IDS[0],
      OPEN_THREAD_IDS[2],
    ];
    vi.mocked(client.post).mockResolvedValue({
      data: {
        id: OPEN_THREAD_IDS[0],
        documentId: DOCUMENT_ID,
        createdById: USER_ID,
        reactions: [],
        data: COMMENT_DATA,
        resolvedAt: RESOLVED_AT,
      },
      policies: [],
    });
    await renderMargin();
    act(() =>
      installEditor(
        createEditorStub(editorOrder, () =>
          runInAction(() => {
            const thread = stores.comments.get(OPEN_THREAD_IDS[0]);
            if (thread) {
              thread.resolvedAt = RESOLVED_AT;
            }
          })
        )
      )
    );
    await act(async () => activateComment(OPEN_THREAD_IDS[0]));

    await act(async () => {
      fireEvent.click(
        within(getCard(OPEN_THREAD_IDS[0])).getByLabelText("Resolve")
      );
    });

    expect(getFocusedId()).toBe(OPEN_THREAD_IDS[2]);
  });

  it("R04 each card is an article named after its author", async () => {
    await renderMargin();
    act(() => initializeEditor(true));

    expect(
      within(getCard(OPEN_THREAD_IDS[0])).queryByRole("article")
    ).toBeNull();
    expect(screen.getAllByRole("article", { name: "Test User" })).toHaveLength(
      OPEN_THREAD_IDS.length
    );
  });

  it("R08 renders one link naming 3 resolved threads", async () => {
    await renderMargin();

    const links = screen.getAllByText(/3 resolved thread/);

    expect(links).toHaveLength(1);
  });

  it("R08 renders no resolved link without resolved threads", async () => {
    seedStores([]);
    await renderMargin();

    expect(screen.queryByText(/resolved thread/)).toBeNull();
  });

  it("R08 the resolved link opens the resolved list", async () => {
    await renderMargin();

    await act(async () => {
      fireEvent.click(screen.getByText(/3 resolved thread/));
    });

    expect(getCardIds()).toEqual(RESOLVED_THREAD_IDS);
  });

  it("R08 the resolved list links back to the open cards", async () => {
    await renderMargin();
    await act(async () => {
      fireEvent.click(screen.getByText(/3 resolved thread/));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Back to open threads"));
    });

    expect(getCardIds()).toEqual(OPEN_THREAD_IDS);
  });

  it("R08 the resolved list scrolls to and focuses its first card", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await renderMargin();
    act(() => initializeEditor(true));

    await act(async () => {
      fireEvent.click(screen.getByText(/3 resolved thread/));
    });

    expect(document.activeElement).toBe(getCard(RESOLVED_THREAD_IDS[0]));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("R08 going back focuses the first open card", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    await renderMargin();
    act(() => initializeEditor(true));
    await act(async () => {
      fireEvent.click(screen.getByText(/3 resolved thread/));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Back to open threads"));
    });

    expect(document.activeElement).toBe(getCard(OPEN_THREAD_IDS[0]));
  });

  it("R08 going back to an empty open list does not focus a later card", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    seedStores(["resolved-1"]);
    runInAction(() => {
      OPEN_THREAD_IDS.forEach((id) => {
        const thread = stores.comments.get(id);
        if (thread) {
          thread.resolvedAt = RESOLVED_AT;
        }
      });
    });
    await renderMargin();
    act(() => initializeEditor(true));
    await act(async () => {
      fireEvent.click(screen.getByText(/4 resolved thread/));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Back to open threads"));
    });

    await act(async () => {
      runInAction(() => {
        const thread = stores.comments.get(OPEN_THREAD_IDS[0]);
        if (thread) {
          thread.resolvedAt = "";
        }
      });
    });

    expect(getCardIds()).toEqual([OPEN_THREAD_IDS[0]]);
    expect(document.activeElement).not.toBe(getCard(OPEN_THREAD_IDS[0]));
  });

  it("R08 resolved cards are not recessed while an open thread is active", async () => {
    await renderMargin();
    act(() => activateComment(OPEN_THREAD_IDS[0]));
    await act(async () => {
      fireEvent.click(screen.getByText(/3 resolved thread/));
    });

    RESOLVED_THREAD_IDS.forEach((id) => {
      expect(getCard(id).querySelector("[data-recessed]")).toBeNull();
    });
  });

  it("R08 the margin stays on the open list after the resolved count drops to 0", async () => {
    seedStores([RESOLVED_THREAD_IDS[0]]);
    await renderMargin();
    await act(async () => {
      fireEvent.click(screen.getByText(/1 resolved thread/));
    });
    await act(async () => {
      runInAction(() => {
        const thread = stores.comments.get(RESOLVED_THREAD_IDS[0]);
        if (thread) {
          thread.resolvedAt = "";
        }
      });
    });

    await act(async () => {
      runInAction(() => {
        OPEN_THREAD_IDS.forEach((id) => {
          const thread = stores.comments.get(id);
          if (thread) {
            thread.resolvedAt = RESOLVED_AT;
          }
        });
      });
    });

    expect(screen.queryByText("Back to open threads")).toBeNull();
    expect(getCardIds()).toEqual([RESOLVED_THREAD_IDS[0]]);
  });
});
