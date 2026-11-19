import styled, { css } from "styled-components";
import { s } from "@shared/styles";

const RAIL_WIDTH = 300;
const RAIL_GAP = 40;
const RAIL_COLLAPSE_WIDTH = 1180;

/** The surface of a card: page background, divider border and round corners. */
export const cardSurface = css`
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  border-radius: 10px;
`;

/** The hover state of a card that is a link. */
export const cardHover = css`
  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

/** The row above a section that holds its h2 and optional controls. */
export const SectionHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  margin-bottom: 12px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 20px;
    color: ${s("text")};
  }
`;

/** A count shown beside a section heading. */
export const Pill = styled.span`
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: ${s("listItemHoverBackground")};
  color: ${s("link")};
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
`;

/** A main column with an optional side rail that drops below it on narrow screens. */
export const RailGrid = styled.div<{ $withRail: boolean }>`
  display: grid;
  grid-template-columns: ${(props) =>
    props.$withRail ? `minmax(0, 1fr) ${RAIL_WIDTH}px` : "minmax(0, 1fr)"};
  gap: ${RAIL_GAP}px;
  align-items: start;

  @media (max-width: ${RAIL_COLLAPSE_WIDTH}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
