import { act, renderHook } from "@testing-library/react-hooks";
import {
  SEE_ALL_THRESHOLD,
  exceedsSeeAllThreshold,
  useTruncatedNodes,
} from "./useTruncatedNodes";

function nodes(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

describe("useTruncatedNodes", () => {
  it("shows the first eight nodes and counts the rest as remaining", () => {
    const { result } = renderHook(() => useTruncatedNodes(nodes(25), true));

    expect(result.current.visible).toHaveLength(8);
    expect(result.current.remaining).toBe(17);
  });

  it("reveals fifty more nodes each time showMore is called", () => {
    const { result } = renderHook(() => useTruncatedNodes(nodes(100), true));

    act(() => result.current.showMore());

    expect(result.current.visible).toHaveLength(58);
    expect(result.current.remaining).toBe(42);
  });

  it("never reports a negative remaining count once everything is visible", () => {
    const { result } = renderHook(() => useTruncatedNodes(nodes(10), true));

    act(() => result.current.showMore());

    expect(result.current.visible).toHaveLength(10);
    expect(result.current.remaining).toBe(0);
  });

  it("resets to the initial count when the node collapses", () => {
    const { result, rerender } = renderHook(
      ({ expanded }) => useTruncatedNodes(nodes(100), expanded),
      { initialProps: { expanded: true } }
    );

    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(58);

    rerender({ expanded: false });
    expect(result.current.visible).toHaveLength(8);
  });

  it("honours a caller supplied initial count", () => {
    const { result } = renderHook(() => useTruncatedNodes(nodes(25), true, 3));

    expect(result.current.visible).toHaveLength(3);
    expect(result.current.remaining).toBe(22);
  });

  it("handles a missing node list", () => {
    const { result } = renderHook(() => useTruncatedNodes(undefined, true));

    expect(result.current.visible).toBeUndefined();
    expect(result.current.remaining).toBe(0);
  });
});

describe("exceedsSeeAllThreshold", () => {
  it("stays below the threshold at exactly the threshold count", () => {
    expect(exceedsSeeAllThreshold(SEE_ALL_THRESHOLD)).toBe(false);
  });

  it("crosses the threshold one node above it", () => {
    expect(exceedsSeeAllThreshold(SEE_ALL_THRESHOLD + 1)).toBe(true);
  });

  it("is false for an empty node list", () => {
    expect(exceedsSeeAllThreshold(0)).toBe(false);
  });

  it("leaves the inline show more path in charge below the threshold", () => {
    const { result } = renderHook(() =>
      useTruncatedNodes(
        Array.from({ length: SEE_ALL_THRESHOLD }, (_, index) => index),
        true
      )
    );

    expect(exceedsSeeAllThreshold(SEE_ALL_THRESHOLD)).toBe(false);
    expect(result.current.remaining).toBeGreaterThan(0);
  });
});
