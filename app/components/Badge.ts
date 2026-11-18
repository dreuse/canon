import { darken, transparentize } from "polished";
import styled from "styled-components";

const Badge = styled.span<{ yellow?: boolean; primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 6px;
  margin: 0 2px;
  background: ${({ yellow, primary, theme }) =>
    yellow
      ? transparentize(0.85, theme.yellow)
      : primary
        ? transparentize(0.85, theme.accent)
        : theme.listItemHoverBackground};
  color: ${({ primary, yellow, theme }) =>
    primary
      ? theme.link
      : yellow
        ? darken(0.1, theme.yellow)
        : theme.textSecondary};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  user-select: none;
  white-space: nowrap;
`;

export default Badge;
