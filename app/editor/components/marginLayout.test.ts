import { layoutMarginCards, MARGIN_CARD_GAP } from "./marginLayout";

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
