/** Vertical space in pixels kept between two stacked margin cards. */
export const MARGIN_CARD_GAP = 12;

interface MarginCard {
  /** Top of the text the card belongs to, or null when that text is gone. */
  anchorTop?: number | null;
  /** Rendered height of the card. */
  height: number;
}

/**
 * Computes the top of each margin card. A card sits level with its anchor,
 * moves below the previous card when they would overlap, and cards without an
 * anchor stack after every anchored card. No card sits above the minimum top.
 *
 * @param cards the cards in any order, each with its anchor top and height.
 * @param gap the space kept between stacked cards.
 * @param minTop the lowest top a card may take.
 * @returns the top of each card, in the order the cards were given.
 */
export function layoutMarginCards(
  cards: MarginCard[],
  gap = MARGIN_CARD_GAP,
  minTop = 0
): number[] {
  const tops = Array.from({ length: cards.length }, () => 0);
  const anchored = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => typeof card.anchorTop === "number")
    .sort((a, b) => (a.card.anchorTop ?? 0) - (b.card.anchorTop ?? 0));
  const orphans = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => typeof card.anchorTop !== "number");

  let nextFree = minTop;

  [...anchored, ...orphans].forEach(({ card, index }) => {
    const top = Math.max(card.anchorTop ?? minTop, nextFree);
    tops[index] = top;
    nextFree = top + card.height + gap;
  });

  return tops;
}

/**
 * Measures the top of the text a margin card belongs to. An anchor that does
 * not render, such as one inside a folded toggle block, is measured at the
 * nearest ancestor inside the root that does render. An ancestor with a zero-height
 * box does not count as rendered.
 *
 * @param anchor the element the card is anchored to.
 * @param root the editor element that bounds the search.
 * @returns the top in viewport pixels, or null when nothing renders.
 */
export function measureAnchorTop(
  anchor: Element,
  root: Element
): number | null {
  if (anchor.getClientRects().length > 0) {
    return anchor.getBoundingClientRect().top;
  }

  for (
    let element = anchor.parentElement;
    element && element !== root && root.contains(element);
    element = element.parentElement
  ) {
    if ([...element.getClientRects()].some((rect) => rect.height > 0)) {
      return element.getBoundingClientRect().top;
    }
  }

  return null;
}
