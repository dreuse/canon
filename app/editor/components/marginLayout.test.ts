import {
  layoutMarginCards,
  MARGIN_CARD_GAP,
  measureAnchorTop,
} from "./marginLayout";

describe("layoutMarginCards", () => {
  it("R04 places each card level with its anchor", () => {
    const tops = layoutMarginCards([
      { anchorTop: 100, height: 50 },
      { anchorTop: 400, height: 50 },
    ]);

    expect(tops).toEqual([100, 400]);
  });

  it("R04 returns tops in input order when anchors are out of order", () => {
    const tops = layoutMarginCards([
      { anchorTop: 400, height: 50 },
      { anchorTop: 100, height: 50 },
    ]);

    expect(tops).toEqual([400, 100]);
  });

  it("R04 pushes a card below the previous one when anchors share a top", () => {
    const tops = layoutMarginCards([
      { anchorTop: 200, height: 80 },
      { anchorTop: 200, height: 60 },
    ]);

    expect(tops).toEqual([200, 200 + 80 + MARGIN_CARD_GAP]);
  });

  it("R04 pushes the next card down when a long thread overruns the gap", () => {
    const tops = layoutMarginCards([
      { anchorTop: 100, height: 500 },
      { anchorTop: 300, height: 60 },
      { anchorTop: 900, height: 60 },
    ]);

    expect(tops).toEqual([100, 100 + 500 + MARGIN_CARD_GAP, 900]);
  });

  it("R04 puts orphan threads after every anchored card", () => {
    const tops = layoutMarginCards([
      { anchorTop: null, height: 40 },
      { anchorTop: 100, height: 50 },
      { anchorTop: undefined, height: 40 },
      { anchorTop: 500, height: 50 },
    ]);

    const lastAnchoredBottom = 500 + 50 + MARGIN_CARD_GAP;
    expect(tops[1]).toBe(100);
    expect(tops[3]).toBe(500);
    expect(tops[0]).toBe(lastAnchoredBottom);
    expect(tops[2]).toBe(lastAnchoredBottom + 40 + MARGIN_CARD_GAP);
  });

  it("R04 starts orphans at the top when nothing is anchored", () => {
    const tops = layoutMarginCards([{ anchorTop: null, height: 40 }]);

    expect(tops).toEqual([0]);
  });

  it("R04 keeps a card at the top when its anchor is above the margin", () => {
    const tops = layoutMarginCards([{ anchorTop: -20, height: 40 }]);

    expect(tops).toEqual([0]);
  });

  it("R04 returns no tops for no cards", () => {
    expect(layoutMarginCards([])).toEqual([]);
  });
});

const RENDERED_HEIGHT = 18;

function render(top: number | null, element: Element) {
  vi.spyOn(element, "getClientRects").mockReturnValue(
    (top === null
      ? []
      : [
          { top, width: 100, height: RENDERED_HEIGHT },
        ]) as unknown as DOMRectList
  );
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    top: top ?? 0,
  } as DOMRect);
}

function buildFoldedToggle() {
  const root = document.createElement("div");
  const toggle = document.createElement("div");
  const head = document.createElement("div");
  const hiddenParagraph = document.createElement("p");
  const anchor = document.createElement("span");
  hiddenParagraph.append(anchor);
  toggle.append(head, hiddenParagraph);
  root.append(toggle);
  document.body.append(root);

  return { root, toggle, head, hiddenParagraph, anchor };
}

describe("measureAnchorTop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("R34 measures a rendered anchor at its own top", () => {
    const { root, anchor } = buildFoldedToggle();
    render(240, anchor);

    expect(measureAnchorTop(anchor, root)).toBe(240);
  });

  it("R34 measures a hidden anchor at the head of its folded toggle", () => {
    const { root, toggle, head, hiddenParagraph, anchor } = buildFoldedToggle();
    render(null, anchor);
    render(null, hiddenParagraph);
    render(900, toggle);
    render(900, head);

    expect(measureAnchorTop(anchor, root)).toBe(900);
  });

  it("R34 keeps a zero-height anchor that still has a box at its own top", () => {
    const { root, anchor } = buildFoldedToggle();
    vi.spyOn(anchor, "getClientRects").mockReturnValue([
      { top: 320, width: 100, height: 0 },
    ] as unknown as DOMRectList);
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({
      top: 320,
    } as DOMRect);

    expect(measureAnchorTop(anchor, root)).toBe(320);
  });

  it("R34 skips a zero-height ancestor and measures the next rendered one", () => {
    const { root, toggle, hiddenParagraph, anchor } = buildFoldedToggle();
    const content = document.createElement("div");
    toggle.append(content);
    content.append(hiddenParagraph);
    render(null, anchor);
    render(null, hiddenParagraph);
    render(640, toggle);
    vi.spyOn(content, "getClientRects").mockReturnValue([
      { top: 700, width: 100, height: 0 },
    ] as unknown as DOMRectList);

    expect(measureAnchorTop(anchor, root)).toBe(640);
  });

  it("R34 resolves a toggle folded inside a folded toggle to the outer head", () => {
    const { root, toggle, head, hiddenParagraph, anchor } = buildFoldedToggle();
    const outer = document.createElement("div");
    root.append(outer);
    outer.append(toggle);
    render(null, anchor);
    render(null, hiddenParagraph);
    render(null, toggle);
    render(null, head);
    render(700, outer);

    expect(measureAnchorTop(anchor, root)).toBe(700);
  });

  it("R34 returns null for a hidden anchor with no rendered ancestor", () => {
    const { root, toggle, hiddenParagraph, anchor } = buildFoldedToggle();
    render(null, anchor);
    render(null, hiddenParagraph);
    render(null, toggle);
    render(500, root);

    expect(measureAnchorTop(anchor, root)).toBeNull();
  });

  it("R34 lays out a hidden anchor as an orphan after anchored cards", () => {
    const { root, toggle, hiddenParagraph, anchor } = buildFoldedToggle();
    render(null, anchor);
    render(null, hiddenParagraph);
    render(null, toggle);
    const hiddenTop = measureAnchorTop(anchor, root);

    const tops = layoutMarginCards([
      { anchorTop: hiddenTop, height: 40 },
      { anchorTop: 100, height: 50 },
      { anchorTop: 400, height: 50 },
    ]);

    expect(tops[1]).toBe(100);
    expect(tops[2]).toBe(400);
    expect(tops[0]).toBe(400 + 50 + MARGIN_CARD_GAP);
  });

  it("R34 stacks two anchors of one folded block on its head row", () => {
    const { root, toggle, head, hiddenParagraph, anchor } = buildFoldedToggle();
    const second = document.createElement("span");
    hiddenParagraph.append(second);
    render(null, anchor);
    render(null, second);
    render(null, hiddenParagraph);
    render(300, toggle);
    render(300, head);

    const tops = layoutMarginCards([
      { anchorTop: measureAnchorTop(anchor, root), height: 80 },
      { anchorTop: measureAnchorTop(second, root), height: 60 },
    ]);

    expect(tops).toEqual([300, 300 + 80 + MARGIN_CARD_GAP]);
  });
});
