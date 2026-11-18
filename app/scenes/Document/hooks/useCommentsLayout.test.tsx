import { act, renderHook } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import * as React from "react";
import { SplitViewContext } from "~/components/SplitView/context";
import stores from "~/stores";
import useCommentsLayout from "./useCommentsLayout";

const DESKTOP_QUERY = /min-width:\s*1025px/;
const WIDE_QUERY = /min-width:\s*1440px/;

type ChangeListener = () => void;

const changeListeners = new Set<ChangeListener>();

function matchesQuery(query: string, width: number) {
  if (DESKTOP_QUERY.test(query)) {
    return width >= 1025;
  }
  return WIDE_QUERY.test(query) ? width >= 1440 : false;
}

function stubViewport(width: number) {
  changeListeners.clear();
  window.innerWidth = width;
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return matchesQuery(query, window.innerWidth);
      },
      addEventListener: (_type: string, listener: ChangeListener) =>
        changeListeners.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) =>
        changeListeners.delete(listener),
    }) as unknown as MediaQueryList;
}

function resizeTo(width: number) {
  act(() => {
    window.innerWidth = width;
    changeListeners.forEach((listener) => listener());
  });
}

function setPanel(panel: "comments" | null) {
  act(() => stores.ui.setRightSidebar(panel, "primary"));
}

function renderLayout(isSplitView = false) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider rootStore={stores}>
      <SplitViewContext.Provider
        value={{ pane: "primary", isSplitView, isFocused: true }}
      >
        {children}
      </SplitViewContext.Provider>
    </Provider>
  );
  return renderHook(() => useCommentsLayout(), { wrapper });
}

describe("useCommentsLayout", () => {
  beforeEach(() => {
    runInAction(() => {
      stores.ui.sidebarCollapsed = false;
    });
    setPanel(null);
  });

  it("R27 returns the shifted layout with text 608 and margin 280 at 1280px", () => {
    stubViewport(1280);
    setPanel("comments");
    const { result } = renderLayout();

    expect(result.current).toMatchObject({
      mode: "shifted",
      textWidth: 608,
      marginWidth: 280,
    });
  });

  it("R27 returns text 593 at 1025px with the sidebar collapsed", () => {
    stubViewport(1025);
    runInAction(() => {
      stores.ui.sidebarCollapsed = true;
    });
    setPanel("comments");
    const { result } = renderLayout();

    expect(stores.ui.sidebarIsClosed).toBe(true);
    expect(result.current).toMatchObject({
      mode: "shifted",
      textWidth: 593,
      marginWidth: 280,
    });
  });

  it("R04 returns the wide layout at 1440px", () => {
    stubViewport(1440);
    setPanel("comments");
    const { result } = renderLayout();

    expect(result.current).toMatchObject({
      mode: "centred",
      textWidth: null,
      marginWidth: 300,
    });
  });

  it("R27 returns no margin layout with Conversas closed", () => {
    stubViewport(1280);
    const { result } = renderLayout();

    expect(result.current.mode).toBe("none");
  });

  it("R27 returns no margin layout in a split view", () => {
    stubViewport(1280);
    setPanel("comments");
    const { result } = renderLayout(true);

    expect(result.current.mode).toBe("none");
  });

  it("R27 restores the centred text when Conversas closes", () => {
    stubViewport(1280);
    setPanel("comments");
    const { result, rerender } = renderLayout();
    expect(result.current.mode).toBe("shifted");

    setPanel(null);
    rerender();

    expect(result.current.mode).toBe("none");
  });

  it("R27 switches layout live when the viewport resizes across 1440px", () => {
    stubViewport(1440);
    setPanel("comments");
    const { result } = renderLayout();
    expect(result.current.mode).toBe("centred");

    resizeTo(1439);
    expect(result.current.mode).toBe("shifted");

    resizeTo(1440);
    expect(result.current.mode).toBe("centred");
  });

  it("R27 switches layout live when the viewport resizes across 1025px", () => {
    stubViewport(1030);
    setPanel("comments");
    const { result } = renderLayout();
    expect(result.current).toMatchObject({
      mode: "shifted",
      marginWidth: 280,
    });

    resizeTo(1024);
    expect(result.current.mode).toBe("none");

    resizeTo(1025);
    expect(result.current).toMatchObject({
      mode: "shifted",
      marginWidth: 280,
    });
  });

  it("R27 does not re-render on a resize within one mode", () => {
    stubViewport(1280);
    setPanel("comments");
    let renders = 0;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider rootStore={stores}>
        <SplitViewContext.Provider
          value={{ pane: "primary", isSplitView: false, isFocused: true }}
        >
          {children}
        </SplitViewContext.Provider>
      </Provider>
    );
    const { result } = renderHook(
      () => {
        renders += 1;
        return useCommentsLayout();
      },
      { wrapper }
    );
    const rendersBefore = renders;

    resizeTo(1300);
    window.dispatchEvent(new Event("resize"));

    expect(renders).toBe(rendersBefore);
    expect(result.current.mode).toBe("shifted");
  });
});
