import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { HEADER_HEIGHT } from "~/components/Header";
import { HStack } from "~/components/primitives/HStack";

export const FILTER_HEIGHT = 40;

export const StickyFilters = styled(HStack)`
  height: ${FILTER_HEIGHT}px;
  position: sticky;
  top: ${HEADER_HEIGHT}px;
  z-index: ${depths.header};
  background: ${s("background")};

  @media (max-width: 768px) {
    height: auto;
    flex-wrap: wrap;
    row-gap: 8px;
    padding-block: 6px;

    > * {
      flex-wrap: wrap;
      row-gap: 8px;
    }
  }
`;
