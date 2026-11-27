import { act, cleanup, render, renderHook } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { HEADER_HEIGHT } from "@shared/constants";
import { UserRole } from "@shared/types";
import { light } from "@shared/styles/theme";
import {
  DocumentContextProvider,
  useDocumentContext,
} from "~/components/DocumentContext";
import { SplitViewContext } from "~/components/SplitView/context";
import type { Editor } from "~/editor";
import { MARGIN_CARD_GAP } from "~/editor/components/marginLayout";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useMarginTransition from "~/scenes/Document/hooks/useMarginTransition";
import stores from "~/stores";
import { sidebarAppearDuration, sidebarSpring } from "~/styles/animations";
import { client } from "~/utils/ApiClient";
import { CommentsMargin } from "./CommentsMargin";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "doc-1";
const THREAD_IDS = ["open-1", "open-2", "open-3"];
const COMMENT_DATA = { type: "doc", content: [{ type: "paragraph" }] };
const CARD_HEIGHT = 100;
const GROWN_HEIGHT = 160;
const SHIFT = 40;
const ANCHOR_START = 200;
const CARDS_MIN_TOP = HEADER_HEIGHT + MARGIN_CARD_GAP;
const FORM_SELECTOR = "[data-margin-form]";
const SLOT_SELECTOR = "[data-margin-slot]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const CENTRED_MARGIN_TOTAL_WIDTH = 340;
const SPRING_BOUNCE = 0.2;
const MARGIN_WIDTH_PROPERTY = "--comments-margin-width";
const LIVE_SLOT_WIDTH = 123;
const SCROLLED_DISTANCE = 2000;
const CARD_SCROLL_MARGIN_RULE = `scroll-margin-top:${CARDS_MIN_TOP}px;`;

type ObserverCallback = () => void;

const resizeCallbacks: ObserverCallback[] = [];
const cardHeights = new Map<string, number>();
const anchorTops = new Map<string, number>();
const anchorElements: HTMLElement[] = [];
let installEditor: (editor: Editor) => void = () => {};
let initializeEditor: (initialized: boolean) => void = () => {};
let editorDom: HTMLElement;
let frameCallbacks: FrameRequestCallback[] = [];
let anchorReads = 0;
const originalOffsetHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "offsetHeight"
);

class ResizeObserverStub {
  private callback: ObserverCallback;
  constructor(callback: ObserverCallback) {
    this.callback = callback;
    resizeCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    const index = resizeCallbacks.indexOf(this.callback);
    if (index >= 0) {
      resizeCallbacks.splice(index, 1);
    }
  }
}

function seedThread(id: string, createdAt: string) {
  stores.comments.add({
    id,
    documentId: DOCUMENT_ID,
    createdById: USER_ID,
    createdAt,
    reactions: [],
    data: COMMENT_DATA,
  });
  stores.policies.add({
    id,
    abilities: { resolve: true, update: true, delete: true },
  });
}

function seedStores() {
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
  THREAD_IDS.forEach((id, index) =>
    seedThread(id, `2026-11-18T09:0${index}:00.000Z`)
  );
}

function addAnchor(threadId: string, top: number) {
  const anchor = document.createElement("span");
  anchor.id = `comment-${threadId}`;
  anchor.getBoundingClientRect = () => {
    anchorReads += 1;
    return { top: anchorTops.get(threadId) ?? 0 } as DOMRect;
  };
  anchor.getClientRects = () =>
    [{ top, width: 10, height: 18 }] as unknown as DOMRectList;
  anchorElements.push(anchor);
  anchorTops.set(threadId, top);
}

function createEditorStub() {
  editorDom = document.createElement("div");
  document.body.appendChild(editorDom);
  anchorElements.forEach((anchor) => editorDom.appendChild(anchor));
  return {
    view: { dom: editorDom, state: { doc: undefined } },
    getHeadings: () => [],
    getTasks: () => [],
    getComments: () => THREAD_IDS.map((id) => ({ id })),
    updateComment: vi.fn(),
    revealComment: vi.fn(),
  } as unknown as Editor;
}

function stubOffsetHeight() {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get(this: HTMLElement) {
      const id = this.getAttribute("data-margin-card");
      if (id) {
        return cardHeights.get(id) ?? 0;
      }
      return this.hasAttribute("data-margin-form") ? CARD_HEIGHT : 0;
    },
  });
}

const Probe = function Probe() {
  const { setEditor, setEditorInitialized } = useDocumentContext();
  installEditor = setEditor;
  initializeEditor = setEditorInitialized;
  return null;
};

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
  await act(async () => {
    installEditor(createEditorStub());
    initializeEditor(true);
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

function topOf(element: HTMLElement) {
  return parseFloat(element.style.top);
}

function isVisible(element: HTMLElement) {
  return element.style.visibility !== "hidden";
}

function fireResizeObservers() {
  resizeCallbacks.forEach((callback) => callback());
}

function visibleCardsOverlap() {
  const boxes = THREAD_IDS.map(getCard)
    .filter(isVisible)
    .map((card) => ({ top: topOf(card), height: card.offsetHeight }))
    .sort((a, b) => a.top - b.top);
  return boxes.some(
    (box, index) =>
      index > 0 && box.top < boxes[index - 1].top + boxes[index - 1].height
  );
}

describe("CommentsMargin placement", () => {
  beforeEach(() => {
    resizeCallbacks.length = 0;
    cardHeights.clear();
    anchorTops.clear();
    frameCallbacks = [];
    anchorReads = 0;
    THREAD_IDS.forEach((id, index) => {
      cardHeights.set(id, CARD_HEIGHT);
      addAnchor(id, ANCHOR_START + index * 300);
    });
    stubOffsetHeight();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    seedStores();
  });

  afterEach(() => {
    anchorElements.splice(0).forEach((anchor) => anchor.remove());
    editorDom?.remove();
    if (originalOffsetHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetHeight",
        originalOffsetHeight
      );
    }
    vi.restoreAllMocks();
  });

  it("R35 puts each card level with its anchor once measured", async () => {
    await renderMargin();

    THREAD_IDS.forEach((id) => {
      expect(topOf(getCard(id))).toBe(anchorTops.get(id));
    });
  });

  it("R35 applies new tops in the DOM when a resize observer reports, before any frame", async () => {
    await renderMargin();
    anchorTops.set(THREAD_IDS[1], ANCHOR_START + 300 + SHIFT);

    fireResizeObservers();

    expect(topOf(getCard(THREAD_IDS[1]))).toBe(ANCHOR_START + 300 + SHIFT);
    expect(frameCallbacks).toHaveLength(0);
  });

  it("R35 applies new tops in the DOM when the editor changes, before any frame", async () => {
    await renderMargin();
    anchorTops.set(THREAD_IDS[2], ANCHOR_START + 600 + SHIFT);

    await act(async () => {
      editorDom.appendChild(document.createElement("p"));
      await Promise.resolve();
    });

    expect(topOf(getCard(THREAD_IDS[2]))).toBe(ANCHOR_START + 600 + SHIFT);
  });

  it("R35 applies new tops in the DOM on window resize, before any frame", async () => {
    await renderMargin();
    anchorTops.set(THREAD_IDS[0], ANCHOR_START + 50);

    window.dispatchEvent(new Event("resize"));

    expect(topOf(getCard(THREAD_IDS[0]))).toBe(ANCHOR_START + 50);
  });

  it("R35 moves the cards below in the same pass when a card grows", async () => {
    THREAD_IDS.forEach((id) => anchorTops.set(id, CARDS_MIN_TOP));
    await renderMargin();
    cardHeights.set(THREAD_IDS[0], GROWN_HEIGHT);

    fireResizeObservers();

    expect(topOf(getCard(THREAD_IDS[1]))).toBe(
      CARDS_MIN_TOP + GROWN_HEIGHT + MARGIN_CARD_GAP
    );
    expect(topOf(getCard(THREAD_IDS[2]))).toBe(
      CARDS_MIN_TOP + GROWN_HEIGHT + CARD_HEIGHT + MARGIN_CARD_GAP * 2
    );
    expect(visibleCardsOverlap()).toBe(false);
  });

  it("R37 keeps the first card below the document header", async () => {
    THREAD_IDS.forEach((id) => anchorTops.set(id, 0));
    await renderMargin();

    expect(topOf(getCard(THREAD_IDS[0]))).toBeGreaterThan(HEADER_HEIGHT);
  });

  it("R35 keeps a card hidden until it has a height", async () => {
    cardHeights.set(THREAD_IDS[1], 0);
    await renderMargin();

    expect(isVisible(getCard(THREAD_IDS[0]))).toBe(true);
    expect(isVisible(getCard(THREAD_IDS[1]))).toBe(false);
  });

  it("R35 shows a hidden card in the same pass its height arrives", async () => {
    cardHeights.set(THREAD_IDS[1], 0);
    await renderMargin();
    cardHeights.set(THREAD_IDS[1], CARD_HEIGHT);

    fireResizeObservers();

    expect(isVisible(getCard(THREAD_IDS[1]))).toBe(true);
    expect(visibleCardsOverlap()).toBe(false);
  });

  it("R35 keeps cards from overlapping while heights settle", async () => {
    THREAD_IDS.forEach((id) => anchorTops.set(id, CARDS_MIN_TOP));
    await renderMargin();

    [135, 120, 165].forEach((height) => {
      cardHeights.set(THREAD_IDS[0], height);
      fireResizeObservers();

      expect(visibleCardsOverlap()).toBe(false);
    });
  });

  it("R35 runs one layout pass for an observer report, not one per card", async () => {
    await renderMargin();
    anchorReads = 0;

    fireResizeObservers();

    expect(anchorReads).toBe(THREAD_IDS.length);
  });

  it("R35 places the new comment form without waiting for a frame", async () => {
    await renderMargin();

    const form = document.querySelector<HTMLElement>(FORM_SELECTOR);

    expect(form).not.toBeNull();
    expect(isVisible(form as HTMLElement)).toBe(true);
    expect(visibleCardsOverlap()).toBe(false);
    expect(topOf(form as HTMLElement)).toBeGreaterThanOrEqual(
      topOf(getCard(THREAD_IDS[2])) + CARD_HEIGHT
    );
  });

  it("places the new comment form in view when the reader has scrolled down", async () => {
    const original = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        return this.tagName === "ASIDE"
          ? ({ top: -SCROLLED_DISTANCE } as DOMRect)
          : original.call(this);
      }
    );
    await renderMargin();

    const form = document.querySelector<HTMLElement>(FORM_SELECTOR);

    expect(topOf(form as HTMLElement)).toBe(SCROLLED_DISTANCE + CARDS_MIN_TOP);
    expect(visibleCardsOverlap()).toBe(false);
  });

  it("R35 does not touch a card removed before the next observer report", async () => {
    await renderMargin();
    await act(async () => {
      runInAction(() => {
        stores.comments.remove(THREAD_IDS[2]);
      });
    });

    expect(() => fireResizeObservers()).not.toThrow();
  });
});

describe("CommentsMargin motion", () => {
  const originalMatchMedia = window.matchMedia;

  function stubMedia(reducedMotion: boolean) {
    window.matchMedia = (query: string) =>
      ({
        media: query,
        matches: query === REDUCED_MOTION_QUERY ? reducedMotion : true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList;
  }

  beforeEach(() => {
    resizeCallbacks.length = 0;
    cardHeights.clear();
    anchorTops.clear();
    frameCallbacks = [];
    THREAD_IDS.forEach((id, index) => {
      cardHeights.set(id, CARD_HEIGHT);
      addAnchor(id, ANCHOR_START + index * 300);
    });
    stubOffsetHeight();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    seedStores();
    act(() => stores.ui.setRightSidebar("comments", "primary"));
  });

  afterEach(() => {
    act(() => stores.ui.setRightSidebar(null, "primary"));
    window.matchMedia = originalMatchMedia;
    anchorElements.splice(0).forEach((anchor) => anchor.remove());
    editorDom?.remove();
    if (originalOffsetHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetHeight",
        originalOffsetHeight
      );
    }
    vi.restoreAllMocks();
  });

  function getSlot() {
    const slot = document.querySelector<HTMLElement>(SLOT_SELECTOR);
    if (!slot) {
      throw new Error("no margin slot");
    }
    return slot;
  }

  it("R36 uses the sidebar spring for the margin and the text column", () => {
    stubMedia(false);

    const { result } = renderHook(() => useMarginTransition());

    expect(result.current.transition).toEqual({
      type: "spring",
      bounce: SPRING_BOUNCE,
      duration: sidebarAppearDuration / 1000,
    });
    expect(result.current.transition).toBe(sidebarSpring);
  });

  it("R36 makes the transition instant with prefers-reduced-motion", () => {
    stubMedia(true);

    const { result } = renderHook(() => useMarginTransition());

    expect(result.current.transition).toEqual({ duration: 0 });
    expect(result.current.reducedMotion).toBe(true);
  });

  it("R36 starts the margin closed and the cards transparent", async () => {
    stubMedia(false);
    await renderMargin();

    expect(getSlot().style.width).toBe("0px");
    expect(getSlot().style.opacity).toBe("0");
    expect(getCard(THREAD_IDS[0]).style.opacity).toBe("0");
  });

  it("R36 renders the margin and the cards at their final size with prefers-reduced-motion", async () => {
    stubMedia(true);
    await renderMargin();

    expect(getSlot().style.width).toBe(`${CENTRED_MARGIN_TOTAL_WIDTH}px`);
    expect(getSlot().style.opacity).toBe("1");
    expect(getCard(THREAD_IDS[0]).style.opacity).toBe("1");
  });
});

describe("CommentsMargin header offset", () => {
  const originalGetBoundingClientRect =
    HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    resizeCallbacks.length = 0;
    cardHeights.clear();
    anchorTops.clear();
    THREAD_IDS.forEach((id, index) => {
      cardHeights.set(id, CARD_HEIGHT);
      addAnchor(id, ANCHOR_START + index * 300);
    });
    stubOffsetHeight();
    seedStores();
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      return this.hasAttribute("data-margin-slot")
        ? ({ width: LIVE_SLOT_WIDTH, top: 0 } as DOMRect)
        : originalGetBoundingClientRect.call(this);
    };
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    anchorElements.splice(0).forEach((anchor) => anchor.remove());
    editorDom?.remove();
    if (originalOffsetHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetHeight",
        originalOffsetHeight
      );
    }
    vi.restoreAllMocks();
  });

  function getSlotParent() {
    const parent =
      document.querySelector<HTMLElement>(SLOT_SELECTOR)?.parentElement;
    if (!parent) {
      throw new Error("no margin slot parent");
    }
    return parent;
  }

  it("R37 keeps a scrolled-to card clear of the document header", async () => {
    await renderMargin();
    const rules = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("");

    expect(rules.includes(CARD_SCROLL_MARGIN_RULE)).toBe(true);
  });

  it("R37 publishes the live slot width for the header to read", async () => {
    await renderMargin();
    act(fireResizeObservers);

    expect(getSlotParent().style.getPropertyValue(MARGIN_WIDTH_PROPERTY)).toBe(
      `${LIVE_SLOT_WIDTH}px`
    );
  });

  it("R37 clears the published width when the margin closes", async () => {
    await renderMargin();
    act(fireResizeObservers);
    const parent = getSlotParent();

    expect(parent.style.getPropertyValue(MARGIN_WIDTH_PROPERTY)).toBe(
      `${LIVE_SLOT_WIDTH}px`
    );

    cleanup();

    expect(parent.style.getPropertyValue(MARGIN_WIDTH_PROPERTY)).toBe("");
  });
});
