import { breakpoints } from "@shared/styles/breakpoint";
import stores from "~/stores";
import Document from "~/models/Document";
import UiStore from "./UiStore";

const NARROW_WIDTH = 1100;
const WIDE_WIDTH = 1300;

type ChangeListener = (event: { matches: boolean }) => void;

function mockViewport(width: number) {
  const listeners: ChangeListener[] = [];
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width")
      ? width < breakpoints.railPanelMin
      : false,
    media: query,
    addEventListener: (_: string, listener: ChangeListener) =>
      listeners.push(listener),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

  return {
    resizeTo: (next: number) =>
      listeners.forEach((listener) =>
        listener({ matches: next < breakpoints.railPanelMin })
      ),
  };
}

describe("UiStore Conversas panel yield", () => {
  let viewport: ReturnType<typeof mockViewport>;

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  function build(width: number) {
    viewport = mockViewport(width);
    const ui = new UiStore(stores);
    ui.setActiveDocument(new Document({ id: "doc-1" }, stores.documents));
    return ui;
  }

  it("R26 hides the panel at 1100px while Conversas is open and restores it on close", () => {
    const ui = build(NARROW_WIDTH);
    expect(ui.sidebarIsClosed).toBe(false);

    ui.setRightSidebar("comments");
    expect(ui.sidebarIsClosed).toBe(true);
    expect(ui.sidebarCollapsed).toBe(false);

    ui.setRightSidebar(null);
    expect(ui.sidebarIsClosed).toBe(false);
  });

  it("R26 keeps the panel at 1300px", () => {
    const ui = build(WIDE_WIDTH);
    ui.setRightSidebar("comments");
    expect(ui.sidebarIsClosed).toBe(false);
  });

  it("R26 does not restore a panel the user had collapsed", () => {
    const ui = build(NARROW_WIDTH);
    ui.collapseSidebar();
    ui.setRightSidebar("comments");
    ui.setRightSidebar(null);
    expect(ui.sidebarIsClosed).toBe(true);
    expect(ui.sidebarCollapsed).toBe(true);
  });

  it("R26 respects the panel being shown while Conversas is open", () => {
    const ui = build(NARROW_WIDTH);
    ui.setRightSidebar("comments");
    ui.toggleCollapsedSidebar();
    expect(ui.sidebarIsClosed).toBe(false);
    expect(ui.sidebarCollapsed).toBe(false);

    ui.toggleCollapsedSidebar();
    expect(ui.sidebarIsClosed).toBe(true);
    expect(ui.sidebarCollapsed).toBe(false);

    ui.expandSidebar();
    expect(ui.sidebarIsClosed).toBe(false);
  });

  it("R26 forgets the shown override when Conversas closes", () => {
    const ui = build(NARROW_WIDTH);
    ui.setRightSidebar("comments");
    ui.expandSidebar();
    ui.setRightSidebar(null);
    ui.setRightSidebar("comments");
    expect(ui.sidebarIsClosed).toBe(true);
  });

  it("R26 follows a resize across 1280px with Conversas open", () => {
    const ui = build(WIDE_WIDTH);
    ui.setRightSidebar("comments");
    expect(ui.sidebarIsClosed).toBe(false);

    viewport.resizeTo(NARROW_WIDTH);
    expect(ui.sidebarIsClosed).toBe(true);

    viewport.resizeTo(WIDE_WIDTH);
    expect(ui.sidebarIsClosed).toBe(false);
  });

  it("R26 ignores the history panel", () => {
    const ui = build(NARROW_WIDTH);
    ui.setRightSidebar("history");
    expect(ui.sidebarIsClosed).toBe(false);
  });

  it("R26 does not yield once no document is active", () => {
    const ui = build(NARROW_WIDTH);
    ui.setRightSidebar("comments");
    expect(ui.sidebarIsClosed).toBe(true);

    ui.clearActiveDocument();
    expect(ui.sidebarIsClosed).toBe(false);
  });

  it("R26 shows a collapsed panel on toggle while Conversas is open", () => {
    const ui = build(NARROW_WIDTH);
    ui.collapseSidebar();
    ui.setRightSidebar("comments");
    ui.toggleCollapsedSidebar();
    expect(ui.sidebarIsClosed).toBe(false);
  });

  it("R26 shows a collapsed panel on rail click while Conversas is open", () => {
    const ui = build(NARROW_WIDTH);
    ui.collapseSidebar();
    ui.setRightSidebar("comments");
    ui.expandSidebar();
    expect(ui.sidebarIsClosed).toBe(false);
  });
});
