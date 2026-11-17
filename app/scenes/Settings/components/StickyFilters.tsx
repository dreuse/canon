import styled from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { depths, s } from "@shared/styles";
import { HEADER_HEIGHT } from "~/components/Header";
import { Wrapper as InputWrapper } from "~/components/Input";
import { HStack } from "~/components/primitives/HStack";

export const FILTER_HEIGHT = 40;

export const StickyFilters = styled(HStack)`
  height: ${FILTER_HEIGHT}px;
  position: sticky;
  top: ${HEADER_HEIGHT}px;
  z-index: ${depths.header};
  background: ${s("background")};

  ${breakpoint("mobile", "tablet")`
    position: static;
    height: auto;
    flex-wrap: wrap;
    justify-content: flex-start;
    row-gap: 8px;
    padding-block: 8px;

    > * {
      flex-wrap: wrap;
      row-gap: 8px;
    }

    ${InputWrapper} {
      flex: 1 1 100%;
      max-width: none;
    }
  `};
`;
