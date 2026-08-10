import styled from "styled-components";
import { s, truncateMultiline } from "@shared/styles";
import Text from "~/components/Text";

/**
 * Highlighted text associated with a comment.
 */
export const HighlightedText = styled(Text)<{ $expanded?: boolean }>`
  display: block;
  position: relative;
  color: ${s("textTertiaryOnTint")};
  background: ${s("sidebarBackground")};
  font-size: 13px;
  line-height: 1.45;
  padding: 8px 12px;
  padding-inline-start: 14px;
  margin: 0;

  > span {
    ${(props) => truncateMultiline(props.$expanded ? 3 : 1)}
  }

  &:after {
    content: "";
    width: 2px;
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    bottom: 0;
    background: ${s("commentMarkBackground")};
  }
`;
