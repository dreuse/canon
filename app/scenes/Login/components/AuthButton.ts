import { darken, lighten, transparentize } from "polished";
import styled, { css } from "styled-components";
import { brand } from "@shared/styles/brand";
import ButtonLarge from "~/components/ButtonLarge";

const AuthButton = styled(ButtonLarge)`
  ${(props) => {
    if (props.neutral) {
      return "";
    }

    const background = props.theme.isDark ? brand.paper : brand.ink;
    const foreground = props.theme.isDark ? brand.ink : brand.paper;
    const hover = props.theme.isDark
      ? darken(0.06, background)
      : lighten(0.08, background);

    return css`
      background: ${background};
      color: ${foreground};

      svg {
        fill: ${foreground};
      }

      &:hover:not(:disabled),
      &[aria-expanded="true"] {
        background: ${hover};
      }

      &:disabled {
        color: ${transparentize(0.3, foreground)};
        background: ${transparentize(0.1, background)};

        svg {
          fill: ${transparentize(0.3, foreground)};
        }
      }
    `;
  }}
`;

export default AuthButton;
