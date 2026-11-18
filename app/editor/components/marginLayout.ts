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
 * anchor stack after every anchored card.
 *
 * @param cards the cards in any order, each with its anchor top and height.
 * @param gap the space kept between stacked cards.
 * @returns the top of each card, in the order the cards were given.
 */
export function layoutMarginCards(
  cards: MarginCard[],
  gap = MARGIN_CARD_GAP
): number[] {
  const tops = Array.from({ length: cards.length }, () => 0);
  const anchored = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => typeof card.anchorTop === "number")
    .sort((a, b) => (a.card.anchorTop ?? 0) - (b.card.anchorTop ?? 0));
  const orphans = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => typeof card.anchorTop !== "number");

  let nextFree = 0;

  [...anchored, ...orphans].forEach(({ card, index }) => {
    const top = Math.max(card.anchorTop ?? 0, nextFree);
    tops[index] = top;
    nextFree = top + card.height + gap;
  });

  return tops;
}
