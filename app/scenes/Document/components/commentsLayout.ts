import { breakpoints } from "@shared/styles/breakpoint";

const CENTRED_MARGIN_WIDTH = 300;
const CENTRED_MARGIN_OFFSET = 40;
const CENTRED_CARD_END_GAP = 18;
const SHIFTED_MARGIN_WIDTH = 280;
const SHIFTED_COLUMN_GAP = 32;
export const SHIFTED_TEXT_MAX_WIDTH = 660;

export type CommentsLayoutMode = "none" | "shifted" | "centred";

export interface CommentsLayout {
  /** None below the desktop breakpoint, shifted text up to wide, centred text from wide. */
  mode: CommentsLayoutMode;
  /** Width in pixels of the text column, or null when the grid sizes it. */
  textWidth: number | null;
  /** Width in pixels of the margin column that holds the comment cards. */
  marginWidth: number;
  /** Space in pixels between the text and the margin column. */
  marginOffset: number;
  /** Space in pixels between the margin column and the window edge. */
  marginEndGap: number;
  /** Space in pixels between a card and the end of the margin column. */
  cardEndGap: number;
}

/** Layout for when no comments margin is shown. */
export const NO_COMMENTS_LAYOUT: CommentsLayout = {
  mode: "none",
  textWidth: null,
  marginWidth: 0,
  marginOffset: 0,
  marginEndGap: 0,
  cardEndGap: 0,
};

/**
 * Computes the document layout used when comments show in the margin.
 *
 * @param viewportWidth the window width in pixels.
 * @param sidebarWidth the width in pixels of the app sidebar beside the document.
 * @returns the layout for the given widths.
 */
export function getCommentsLayout(
  viewportWidth: number,
  sidebarWidth: number
): CommentsLayout {
  if (viewportWidth >= breakpoints.desktopWide) {
    return {
      mode: "centred",
      textWidth: null,
      marginWidth: CENTRED_MARGIN_WIDTH,
      marginOffset: CENTRED_MARGIN_OFFSET,
      marginEndGap: 0,
      cardEndGap: CENTRED_CARD_END_GAP,
    };
  }

  if (viewportWidth >= breakpoints.desktop) {
    const available =
      viewportWidth -
      sidebarWidth -
      SHIFTED_COLUMN_GAP * 3 -
      SHIFTED_MARGIN_WIDTH;
    return {
      mode: "shifted",
      textWidth: Math.min(SHIFTED_TEXT_MAX_WIDTH, available),
      marginWidth: SHIFTED_MARGIN_WIDTH,
      marginOffset: SHIFTED_COLUMN_GAP,
      marginEndGap: SHIFTED_COLUMN_GAP,
      cardEndGap: 0,
    };
  }

  return NO_COMMENTS_LAYOUT;
}
